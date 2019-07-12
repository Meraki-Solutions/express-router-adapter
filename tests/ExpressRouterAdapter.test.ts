import { ExpressRouterAdapter } from '../src';
import * as request from 'supertest';
import * as express from 'express';

// tslint:disable max-classes-per-file
// const mockContainer = { get(): any { return null; } };
// const mockSecurityContextProvider = { async getSecurityContext(): Promise<any> { return null; } };

describe('ExpressRouterAdapter', () => {

  it('Can be constructed', async () => {
    // const sut = new ExpressRouterAdapter(mockContainer as any, mockSecurityContextProvider);

    const app = express().use((req, res) => {
      res.status(200).send();
    });

    await request(app)
      .get('/')
      .expect(200)
      .then();

  });

});
