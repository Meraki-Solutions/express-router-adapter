import { ExpressRouterAdapter } from '../src';

// tslint:disable max-classes-per-file
const mockContainer = { get(): any { return null; } };
const mockSecurityContextProvider = { async getSecurityContext(): Promise<any> { return null; } };

describe('ExpressRouterAdapter', () => {

  it('Can be constructed', () => {
    const sut = new ExpressRouterAdapter(mockContainer as any, mockSecurityContextProvider);
  });

});
