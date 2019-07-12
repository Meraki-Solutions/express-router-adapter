import 'reflect-metadata';
import { ExpressRouterAdapter, RouterMetaBuilder } from '../src';
import * as request from 'supertest';
import * as express from 'express';
import { Container } from 'aurelia-dependency-injection';

// tslint:disable max-classes-per-file
const mockSecurityContextProvider = { async getSecurityContext(): Promise<any> { return null; } };

describe('ExpressRouterAdapter', () => {

  it('Can be constructed', async () => {
    class HelloWorldRouter{
      hello = new RouterMetaBuilder()
        .path('/')
        .allowAnonymous()
        .get(() => {

        });
    }

    const app = express();
    const sut = new ExpressRouterAdapter(new Container(), mockSecurityContextProvider);
    sut.adapt({ Router: HelloWorldRouter, expressApp: app });

    await request(app)
      .get('/')
      .expect(204)
      .then();

  });

});
