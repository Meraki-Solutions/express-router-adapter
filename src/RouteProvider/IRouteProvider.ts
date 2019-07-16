import { IHTTPRoute } from '../RouterMetaBuilder';

export interface IRouteProvider {
    getRoutes: () => IHTTPRoute[];
}
