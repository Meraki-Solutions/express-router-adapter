import 'reflect-metadata';
import { ExpressRouterAdapter, RouterMetaBuilder } from '../src';
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