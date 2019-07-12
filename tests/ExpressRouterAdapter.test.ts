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

  it('given a custom media type, should get the correct media type in the response', async () => {
    class CustomMediaType{
      mediaType = 'application/vnd.custom+json';

      formatForResponse({ hello }, { req, res, tenantId, securityContext}){
        return { hello, anotherProp: 'yay' };
      };
    }

    const sut = buildSuperTestHarnessForRoute(
      new RouterMetaBuilder()
        .path('/')
        .allowAnonymous()
        .mediaType(CustomMediaType)
        .get(() => ({ hello: 'world' }))
    );
    await sut.get('/')
      .set('accept', 'application/vnd.custom+json')
      .expect(200)
      .expect(res => assert.ok(res.headers['content-type'].startsWith('application/vnd.custom+json'), `expected ${res.headers['content-type']} to contain application/vnd.custom+json`))
      .expect({ hello: 'world', anotherProp: 'yay' });
  });

  it('should require the media type...')
  it('should error if neither are implemeneted...')
  it('should support returning http response...')
  it('should formatFromRequest...')
  it('should custom handler...')
  it('new, should support passing in req (read a query param)')
});

function buildSuperTestHarnessForRoute(route){
  return request(buildExpressAppWithRoute(route));
}

function buildExpressAppWithRoute(route){
  const app = express();
  const sut = new ExpressRouterAdapter(new Container(), mockSecurityContextProvider);
  sut.adapt({ Router: {
    route
  }, expressApp: app });
  return app;
}
