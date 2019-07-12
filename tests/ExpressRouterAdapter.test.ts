import 'reflect-metadata';
import { ExpressRouterAdapter, RouterMetaBuilder } from '../src';
import * as request from 'supertest';
import * as express from 'express';
import { Container } from 'aurelia-dependency-injection';

// tslint:disable max-classes-per-file
const mockSecurityContextProvider = { async getSecurityContext(): Promise<any> { return null; } };

describe('ExpressRouterAdapter', () => {
  it('should 204 when no model is returned', async () => {
    const sut = await buildSuperTestHarnessForRoute(
      new RouterMetaBuilder()
        .path('/')
        .allowAnonymous()
        .get(() => {})
    );

    sut.get('/')
      .expect(204)
      .then();
  })

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