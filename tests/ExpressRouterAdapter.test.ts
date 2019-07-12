import { ExpressRouterAdapter } from '../src';
import * as assert from 'assert';

// tslint:disable max-classes-per-file
const mockContainer = { get(key: any): any {} };
const mockSecurityContextProvider = { async getSecurityContext(): Promise<any> {} };

describe('ExpressRouterAdapter', () => {

  it('Can be constructed', () => {
    const sut = new ExpressRouterAdapter(mockContainer, mockSecurityContextProvider);
  });

});
