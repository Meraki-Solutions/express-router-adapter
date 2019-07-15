import 'reflect-metadata';
import { ExpressRouterAdapter, RouterMetaBuilder, HTTPResponse } from '../src';
import * as request from 'supertest';
import * as express from 'express';
import { Container } from 'aurelia-dependency-injection';
import * as assert from 'assert';

// tslint:disable max-classes-per-file
const mockSecurityContextProvider = { async getSecurityContext(): Promise<any> { return null; } };

describe('ExpressRouterAdapter', () => {
  it('when no model is returned, should 204', async () => {
    const sut = buildSuperTestHarnessForRoute(
      new RouterMetaBuilder()
        .path('/')
        .allowAnonymous()
        .get(() => {})
    );

    await sut.get('/')
      .expect(204)
      .then();
  });

  it('when a body is returned, should 200', async () => {
    const sut = buildSuperTestHarnessForRoute(
      new RouterMetaBuilder()
        .path('/')
        .allowAnonymous()
        .get(() => ({ hello: 'world' }))
    );

    await sut.get('/')
      .expect(200)
      .expect('content-type', /^application\/json.*/)
      .expect({ hello: 'world' })
      .then();
  });

  it('when an http response with an body is returned, should 200', async () => {
    const sut = await buildSuperTestHarnessForRoute(
      new RouterMetaBuilder()
        .path('/')
        .allowAnonymous()
        .get(() => new HTTPResponse({ status: 200, body: { hello: 'world' }}))
    );

    await sut.get('/')
      .expect('content-type', /^application\/json.*/)
      .expect(200)
      .expect({ hello: 'world' });
  });

  it('when an http response with a send method is returned, should use that', async () => {
    const sut = await buildSuperTestHarnessForRoute(
      new RouterMetaBuilder()
        .path('/')
        .allowAnonymous()
        .get(() => ({
          isHTTPResponse: true,
          status: 200,
          async send({ res }) {
            res.set('X-CUSTOM-HEADER', 'hello world').json({ hello: 'world' });
          }
        }))
    );

    await sut.get('/')
      .expect(200)
      .expect({ hello: 'world' })
      .expect('X-CUSTOM-HEADER', 'hello world');
  });

  describe('given a custom media type', () => {
    let sut;

    beforeEach(() => {
      class CustomMediaType{
        mediaType = 'application/vnd.custom+json';

        formatForResponse({ hello }, { req, res, tenantId, securityContext}){
          return { hello, anotherProp: 'yay' };
        };
      }

      sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .mediaType(CustomMediaType)
          .get(() => ({ hello: 'world' }))
      );
    })
    it('should get the correct media type in the response', async () => {
      await sut.get('/')
        .set('accept', 'application/vnd.custom+json')
        .expect(200)
        // tslint:disable-next-line max-line-length
        .expect(res => assert.ok(res.headers['content-type'].startsWith('application/vnd.custom+json'), `expected ${res.headers['content-type']} to contain application/vnd.custom+json`))
        .expect({ hello: 'world', anotherProp: 'yay' });
    });

    it('should require the custom media type', async () => {
      await sut.get('/')
        .set('accept', 'application/json')
        .expect(406)
        .then({ some: 'body' });
    });
  });


  // Not sure what this test would be. mediaType property is not currently required on media formatters
  // It defaults it application/json
  it('should require the media type...');

  it('should error if both formatFromRequest and formatForResponse are missing', async () => {
    assert.throws(() => {
      const sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .mediaType(class MediaTypeNoMethods {
            // missing formatFromRequest AND formatForResponse
          })
          .get(() => ({ hello: 'world' }))
      );
    });
  });

  it('should support returning http response from formatter', async () => {
      const sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .mediaType(class MediaTypeReturnsHTTPResponse {
            formatForResponse() {
              return new HTTPResponse({
                status: 302,
                headers: {
                  Location: '/somewhere-else'
                }
              });
            }
          })
          .get(() => ({ hello: 'world' }))
      );

      await sut.get('/')
        .expect(302)
        .expect('Location', '/somewhere-else');
  });

  it('given the custom media type and a request body, it should format the body', async () => {
      const sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .mediaType(class MediaTypeWithFormatFromRequest {
            formatFromRequest({ hello }) {
              return { hello: `not-${hello}` };
            }

            // needed to pass through value from formatFromRequest
            // otherwise will result in 204 no content
            formatForResponse({ hello }) {
              return { hello };
            }

          })
          .post(
            ({ model: { hello } }) => {
              return { hello };
            }
          )
      );

      await sut
        .post('/')
          .send({ hello: 'world' })
          .expect(200)
          .expect({ hello: 'not-world' });
  });

  it('given a media type with a custom handler, should use the handler not the default', async () => {
      const sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .mediaType(class MediaTypeWithFormatFromRequest {
            formatFromRequest(passThrough) {
              return passThrough;
            }

            formatForResponse(passThrough) {
              return passThrough;
            }
          }, () => {
            return { message: 'hi from custom media type handler!' };
          })
          .get(
            () => {
              throw new Error('Default handler was called instead of custom media type handler');
            }
          )
      );

      await sut
        .get('/')
          .expect(200)
          .expect({ message: 'hi from custom media type handler!' });

  });

  it('new, should support passing in req (read a query param)')
});

function buildSuperTestHarnessForRoute(route){
  return request(buildExpressAppWithRoute(route));
}

function buildExpressAppWithRoute(route){
  const app = express();
  app.use(express.json());
  const sut = new ExpressRouterAdapter(new Container(), mockSecurityContextProvider);
  sut.adapt({ Router: {
    route
  }, expressApp: app });

  // override the default error handler so it doesn't console.log
  app.use((error, req, res, next) => {
    res.status(error.status || 500).json(error);
  });
  return app;
}
