import 'reflect-metadata';
import { ExpressRouterAdapter, RouterMetaBuilder, HTTPResponse } from '../src';
import * as request from 'supertest';
import * as express from 'express';
import { Container } from 'aurelia-dependency-injection';

// tslint:disable max-classes-per-file
const mockSecurityContextProvider = { async getSecurityContext(): Promise<any> { return null; } };

describe('ExpressRouterAdapter', () => {
  it('when no model is returned, should 204', async () => {
    const sut = await buildSuperTestHarnessForRoute(
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
    const sut = await buildSuperTestHarnessForRoute(
      new RouterMetaBuilder()
        .path('/')
        .allowAnonymous()
        .get(() => ({ hello: 'world' }))
    );

    await sut.get('/')
      .expect(200)
      .expect('content-type', /application\/json.*/)
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
      .expect('Content-Type', /json/)
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
