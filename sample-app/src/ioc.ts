import 'reflect-metadata'; // Required by aurelia-dependency-injection

import { ISecurityContext, ISecurityContextProvider, RouteProvider, SecurityContextProvider } from '@symbiotic/express-router-adapter';
import { Container } from 'aurelia-dependency-injection';
import { ApplicationRouteProvider } from './ApplicationRouteProvider';

class ApplicationSecurityContext implements ISecurityContext {
  constructor(public principal: string) { }
  toLogSafeString(): string {
    return this.principal;
  }
}
// tslint:disable-next-line: max-classes-per-file
class ApplicationSecurityContextProvider implements ISecurityContextProvider {
  async getSecurityContext({ req }: any): Promise<ApplicationSecurityContext> {
    console.log('in here?');
    const authHeader = req.headers.authorization;
    // this is NOT real security
    return new ApplicationSecurityContext(authHeader);
  }

}

export const getContainer = async (): Promise<Container> => {
  const container = new Container();

  container.registerAlias(ApplicationRouteProvider, RouteProvider);
  container.registerAlias(ApplicationSecurityContextProvider, SecurityContextProvider);

  return container;
};
