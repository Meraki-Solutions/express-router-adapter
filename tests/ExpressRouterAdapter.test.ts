import { ExpressRouterAdapter } from '../src';
import * as assert from 'assert';

// tslint:disable max-classes-per-file
const mockContainer = { get(): any { return null; } };
const mockSecurityContextProvider = { async getSecurityContext(): Promise<any> { return null; } };
const mockErrorFactory = { createError(): Error { return new Error('Mock me'); } };

describe('ExpressRouterAdapter', () => {

  it('Can be constructed', () => {
    const sut = new ExpressRouterAdapter(mockContainer as any, mockSecurityContextProvider, mockErrorFactory);
  });

});
