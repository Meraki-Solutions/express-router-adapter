import { IHTTPRoute } from '../RouterMetaBuilder';
import { IRouteProvider } from './IRouteProvider';

export class CompositeRouteProvider {
  private routers: IRouteProvider[] = [];

  constructor(...routers: IRouteProvider[]) {
    this.routers = routers;
  }

  getRoutes(): IHTTPRoute[] {
    const routes = [];

    this.routers.forEach(router => {
      router.getRoutes().forEach(route => {
        routes.push(route);
      });
    });

    return routes;
  }

}
