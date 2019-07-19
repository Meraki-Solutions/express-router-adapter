import {
  ExpressRouterAdapter,
  RouterMetaBuilder,
  HTTPResponse,
  ExpressRouterAdapterConfig,
  SecurityContextProvider
} from '../src';
import * as request from 'supertest';
import * as express from 'express';
import * as assert from 'assert';

// tslint:disable max-classes-per-file
const mockLog = {
  info(...params: any) {
    // do nothing
  },
  debug(...params: any) {
    // do nothing
  }
};

describe('ExpressRouterAdapter', () => {

  describe('pass through', () => {
    it('default pass through works for responses when no media types are registered', async () => {
      const sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .get(() => {
            return 'ok';
          })
      );

      await sut.get('/')
        .set('accept', 'text/plain')
        .expect(200)
        .expect('"ok"');
    });

    it('default pass through works for requests when no media types are registered', async () => {
      const sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .post(() => {
            return 'ok';
          })
      );

      await sut.post('/')
        .set('accept', 'text/plain')
        .expect(200)
        .expect('"ok"');
    });
  });

  describe('timeouts', () => {

    it('should timeout if exceeds default timeout', async () => {
      const sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .get(() => {
            return new Promise((resolve) => {
              setTimeout(
                () => resolve(),
                61
              );
            });
          }),
        60
      );

      await sut.get('/')
        .expect(503)
        .expect(res => assert.equal(res.body.code, 'timedout'));
    });

    it('should timeout if exceeds route timeout', async () => {
      const sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .timeout(50)
          .get(() => {
            return new Promise((resolve) => {
              setTimeout(
                () => resolve(),
                51
              );
            });
          })
      );

      await sut.get('/')
        .expect(503)
        .expect(res => assert.equal(res.body.code, 'timedout'));
    });

  });

  it('when no model is returned, should 204', async () => {
    const sut = buildSuperTestHarnessForRoute(
      new RouterMetaBuilder()
        .path('/')
        .allowAnonymous()
        .get(() => {
          // intentionally empty
        })
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
      sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .mediaType({
            mediaType: 'application/vnd.custom+json',
            formatForResponse({ hello }) {
              return { hello, anotherProp: 'yay' };
            },
            formatFromRequest(body) {
              return body;
            }
          })
          .get(() => ({ hello: 'world' }))
      );
    });

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

  it('should error if both formatFromRequest and formatForResponse are missing', async () => {
    assert.throws(() => {
      const sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .mediaType({
            // missing formatFromRequest AND formatForResponse
          } as any)
          .get(() => ({ hello: 'world' }))
      );
    });
  });

  it('should support returning http response from formatter', async () => {
      const sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .mediaType({
            mediaType: 'application/json',
            formatForResponse() {
              return new HTTPResponse({
                status: 302,
                headers: {
                  Location: '/somewhere-else'
                }
              });
            },
            formatFromRequest(body) {
              return body;
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
          .mediaType({
            mediaType: 'application/vnd.custom+json',

            formatFromRequest({ hello }) {
              return { hello: `not-${hello}` };
            },

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
          .set('accept', 'application/vnd.custom+json')
          .set('content-type', 'application/vnd.custom+json')
          .send({ hello: 'world' })
          .expect(200)
          .expect({ hello: 'not-world' });

      await sut
        .post('/')
          .set('accept', 'application/vnd.custom+json')
          .send({ hello: 'world' })
          .expect(415);
  });

  it('given a media type with a custom handler, should use the handler not the default', async () => {
      const sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .mediaType({
            mediaType: 'application/json',

            formatFromRequest(passThrough) {
              return passThrough;
            },

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

  it('formatters can use values from req.query to format responses', async () => {
      const sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .mediaType({
            mediaType: 'application/json',
            formatForResponse({ hello }, { req } ) {
              const { uppercase } = req.query;
              return { hello: uppercase === '1' ? hello.toUpperCase() : hello };
            },
            formatFromRequest(body) {
              return body;
            }
          })
          .get(
            () => {
              return { hello: 'world' };
            }
          )
      );

      await sut
        .get('/')
          .expect(200)
          .query({ uppercase: '1' })
          .expect({ hello: 'WORLD' });

      await sut
        .get('/')
          .expect(200)
          .expect({ hello: 'world' });
  });

  it('formatters can use values from req.query to format requests', async () => {
      const sut = buildSuperTestHarnessForRoute(
        new RouterMetaBuilder()
          .path('/')
          .allowAnonymous()
          .mediaType({
            mediaType: 'application/json',
            formatFromRequest({ hello }, { req } ) {
              const { uppercase } = req.query;
              return { hello: uppercase === '1' ? hello.toUpperCase() : hello };
            },

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
          .query({ uppercase: '1' })
          .send({ hello: 'world' })
          .expect({ hello: 'WORLD' })
          .expect(200);

      await sut
        .post('/')
          .send({ hello: 'world' })
          .expect({ hello: 'world' })
          .expect(200);
  });

});

function buildSuperTestHarnessForRoute(route, timeout = 500) {
  return request(buildExpressAppWithRoute(route, timeout));
}

function buildExpressAppWithRoute(route, timeout) {
  const app = express();
  app.use(express.json({
    type: ['application/json', '+json']
  }));
  const sut = new ExpressRouterAdapter(
    new ExpressRouterAdapterConfig({
      TIMEOUT: timeout
    }),
    {
      getRoutes: () => [route]
    },
    new SecurityContextProvider(),
    mockLog
  );
  sut.applyRoutes(app);

  // override the default error handler so it doesn't console.log
  app.use((error, req, res, next) => {
    res.status(error.status || 500).json(error);
  });
  return app;
}
