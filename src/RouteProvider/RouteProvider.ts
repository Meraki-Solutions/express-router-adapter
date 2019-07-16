import { IHTTPRoute } from '../RouterMetaBuilder';
import { IRouteProvider } from './IRouteProvider';

export class RouteProvider implements IRouteProvider {
    getRoutes(): IHTTPRoute[] {
        throw new Error('You must override RouteProvider when instantiating ExpressRouterAdapter');
    }
}
