import { Request } from 'express';

/**
 * This builds the necessary state for the ExpressRouterAdapter
 *
 * This is forward looking to decorators which might look like this
 *
 *  @httpGet('/organizations/:orgId/opportunities')
 *  @mediaType(() => OppListingFormatter)
 *  @query('onOrAfter')
 *  async getOpportunities({ orgId, onOrAfter }){
 *      return await opportunityManager.getOpportunitiesByOrganization({ orgId, onOrAfter });
 *  }
 */
export interface IControllerParams {
    req: Request;
    body?: any;
    model?: any;
    securityContext: any;
}

type RouteHandler = (controllerParams?: IControllerParams) => any;
type HTTPVerbSetter = (defaultHandler: RouteHandler) => RouterMetaBuilder;

export class RouterMetaBuilder {
    private state: any;

    public get: HTTPVerbSetter;
    public post: HTTPVerbSetter;
    public delete: HTTPVerbSetter;
    public put: HTTPVerbSetter;
    public patch: HTTPVerbSetter;

    constructor(state: any = { }) {
        this.state = state;

        const verbs = ['get', 'post', 'delete', 'put', 'patch'];
        verbs.forEach((verb) => {
            this[verb] = (defaultHandler: RouteHandler) => {
                if (defaultHandler) {
                    return new RouterMetaBuilder({ ...this.state, verb, defaultHandler });
                } else {
                    return new RouterMetaBuilder({ ...this.state, verb });
                }
            };
        });
    }

    build = () => {
        const { path, mediaTypeFormatters, verb, queryKeys, authorizers, allowAnonymous, defaultHandler } = this.state;

        return {
            httpVerb: verb,
            httpPath: path,
            mediaTypeFormatters,
            httpQueryParams: queryKeys,
            httpAuthorizers: authorizers,
            allowAnonymous,
            defaultHandler
        };
    }

    path = (path: string): RouterMetaBuilder => {
        return new RouterMetaBuilder({ ...this.state, path });
    }

    mediaType = (MediaTypeFormatter: any, handler?: RouteHandler): RouterMetaBuilder => {
        const mediaTypeFormatters = this.state.mediaTypeFormatters || [];

        // we attempted to do this with WeakMap but it isn't practical to clone so we fell back to this
        //  we also considered maintaining a parallel sparse array but felt like this tradeoff was slightly
        //  better than that
        return new RouterMetaBuilder({
            ...this.state,
            mediaTypeFormatters : [ ...mediaTypeFormatters, { formatter: MediaTypeFormatter, handler } ]
        });
    }

    query = (...queryKeys: string[]): RouterMetaBuilder => {
        return new RouterMetaBuilder({ ...this.state, queryKeys : [...(this.state.queryKeys || []), ...queryKeys] });
    }

    authorize = (Authorizer: any): RouterMetaBuilder => {
        return new RouterMetaBuilder({ ...this.state, authorizers : [...(this.state.authorizers || []), Authorizer] });
    }

    allowAnonymous = (): RouterMetaBuilder => {
        return new RouterMetaBuilder({ ...this.state, allowAnonymous : true });
    }
}
