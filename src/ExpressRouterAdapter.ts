// tslint:disable max-classes-per-file no-null-keyword
import { Application } from 'express';
import * as timeoutMiddleware from 'connect-timeout';
import * as properUrlJoin from 'proper-url-join';
import { HTTPResponse, HTTPError } from './HTTPResponse';
import { IHTTPRoute } from './RouterMetaBuilder';
import { ISecurityContextProvider, SecurityContextProvider } from './SecurityContext';
import { IRouteProvider, RouteProvider } from './RouteProvider';
import { ILog, Log } from './Log';

const isAcceptableMediaType = (mediaType, req) => {
    // req might say to accept anything, which will cause it to accept the first only listed above
    const result = req.accepts('application/json', mediaType);

    if (result !== mediaType) {
        return false;
    } else {
        return true;
    }
};

const isAcceptableContentType = (mediaType, req) => {
    return Boolean(req.is(mediaType));
};

// This is a pass through formatter with no media type specified. This is used by ExpressRouterAdapter
// when a route is setup with no media types. It is not currently exposed because it is an anti-pattern.
// 1) we should specify the media type string to get predictable versioning.
// 2) we should be explicit about what we return so we don't expose internals accidentally
// Media types should not be considered reusable. It may be tempting to re-use `application/json` after you're
// down to only one media type again - but if an old client pops back on to the network and requests `application/json`
// they are expecting the old schema, not the new one, and it will be difficult to triage
// compared to seeing someone requesting `application/json` when that is not supported anymore.
class PassThroughFormatter {
    formatFromRequest(body: any): any {
        return body;
    }
    formatForResponse(model: any): any {
        return model;
    }
}

export class ExpressRouterAdapterConfig {
    BASE_PATH: string = '/';
    TIMEOUT: string | number;

    constructor(config: any = {}) {
        Object.assign(
            this,
            config
        );
    }
}

/**
 * ExpressRouterAdapter is meant to make RESTful practices easy to implement.
 *
 * There are effectively 3 phases to be aware of.
 *
 * 1. Using Content-Type to support versioning and formatting of the body coming in and to convert to a request-model.
 *
 * 2. The Handler to take the request / request-model and produce a response / response-model.
 *
 * 3. Using Accept to support versioning and formatting of the response-model to the response body.
 *
 * For both Content-Type and Accept media type formatting
 *  - If no MediaTypes are specified, it is assumed that a pass through MediaType should be used.
 *  - If MediaTypes are specified, and a default pass through MediaType is desired, it must be added explicitly.
 *  - If a MediaType string does match, but it doesn't implement the appropriate method
 *    (`formatFromRequest` or `formatForResponse`) then it is not considered a match.
 *  - If more than one MediaType matches, then the first will be used.
 *    This is likely only relevant for a default MediaType that matches on everything, which must be added last.
 *  - If the response-model is null or undefined, the response will be a 204, regardless of the MediaTypes/Accept Header
 *
 * Only one handler will be used based on the following precedence, the first matching Content-Type MediaType handler,
 * the first matching Accept MediaType handler, the default handler.
 *
 * You can return an HttpResponse as your model to further control the response, but you will also give up formatting.
 * Ideally it would still go through Accept formatting.
 */
export class ExpressRouterAdapter {
    static inject = [ExpressRouterAdapterConfig, RouteProvider, SecurityContextProvider, Log];

    constructor(
        private config: ExpressRouterAdapterConfig,
        private routeProvider: IRouteProvider,
        private securityContextProvider: ISecurityContextProvider,
        private log: ILog
    ) {}

    applyRoutes = (app: Application) => {
        const { log, securityContextProvider } = this;
        const { BASE_PATH, TIMEOUT: GLOBAL_TIMEOUT } = this.config;

        this.routeProvider.getRoutes().forEach(addRoute);

        function addRoute({
            defaultHandler,
            httpVerb,
            httpPath,
            mediaTypeFormatters = [],
            httpQueryParams = [],
            allowAnonymous = false,
            timeout
        }: IHTTPRoute): void {
            log.debug('adding route', httpVerb, httpPath);

            const { requestFormatters, responseFormatters } = prepFormatters({ mediaTypeFormatters });
            const routeMiddleware = [];
            const routeTimeout = timeout || GLOBAL_TIMEOUT;
            if (routeTimeout) {
                routeMiddleware.push(timeoutMiddleware(routeTimeout, { respond: false }));
            }

            app[httpVerb](properUrlJoin(BASE_PATH, httpPath), routeMiddleware, async (req, res, next) => {
                try {
                    let requestLogMessage = `${req.method} ${req.url}`;

                    log.info(requestLogMessage);
                    log.debug('headers', req.headers);

                    req.on('timeout', () => next(new HTTPError({
                        status: 503,
                        message: `Request timeout of ${routeTimeout} exceeded`,
                        // TODO: Add an optional code 'timedout'
                    })));

                    const body = ['PUT', 'PATCH', 'POST'].includes(req.method) ? req.body : null;

                    const requestFormatter = getRequestFormatter({ req, requestFormatters, body });
                    const responseFormatter = getResponseFormatter({ req, responseFormatters });
                    const handler = getHandlerForRequest({ req, defaultHandler, requestFormatter, responseFormatter });

                    validateCanProcessRequest({
                        req,
                        body,
                        requestFormatter,
                        requestFormatters,
                        responseFormatter,
                        responseFormatters,
                        handler
                    });

                    const controllerParams =  {...req.params, req };
                    httpQueryParams.forEach((queryKey) => controllerParams[queryKey] = req.query[queryKey]);

                    if (body) {
                        log.debug('body', JSON.stringify(body));
                        controllerParams.body = body;

                        controllerParams.model = requestFormatter.formatter.formatFromRequest(req.body, { req });
                    }

                    const securityContext = await securityContextProvider.getSecurityContext({ req });

                    requestLogMessage += ` (${securityContext.toLogSafeString()})`;

                    log.info(requestLogMessage);

                    // Make security context available to error handler
                    req.expressRouterAdapter = { securityContext };

                    if (!allowAnonymous && (!securityContext || !securityContext.principal)) {
                        throw new HTTPError({
                            status: 401,
                            message: 'Authorization is required'
                        });
                    }
                    controllerParams.securityContext = securityContext;

                    let model = await handler(controllerParams);

                    if (!model) {
                        model = new HTTPResponse({ status: 204 });
                    } else if (!responseFormatter) {
                        model = new HTTPResponse({
                            status: 204,
                            headers: { 'wl-debug': 'unable to format response' }
                        });
                    } else if (!model.isHTTPResponse) {
                        const formattedModel = await responseFormatter.formatter.formatForResponse(model, { req, res });
                        const { isHTTPResponse = false } = formattedModel;
                        const { mediaType } = responseFormatter.formatter;

                        const httpResponse = isHTTPResponse ?
                            formattedModel :
                            new HTTPResponse({ status: 200, body: formattedModel });

                        if (mediaType) {
                            httpResponse.headers['content-type'] = httpResponse.headers['content-type'] || mediaType;
                        }

                        model = httpResponse;
                    }

                    if (!req.timedout) {
                        await handleHTTPResponseModel({ response: res, model });
                    }

                    log.info(`${res.statusCode} ${requestLogMessage}`);
                } catch (err) {
                    next(err);
                }
            });
        }

        function prepFormatters({ mediaTypeFormatters }: any): any {
            if (mediaTypeFormatters.length === 0) {
                mediaTypeFormatters.push({ formatter: new PassThroughFormatter() });
            }

            const formatterInstances = mediaTypeFormatters.map(({ formatter, handler }) => {
                assertValidFormatter(formatter);
                return { formatter, handler };
            });
            const requestFormatters = formatterInstances.filter(
                mt => typeof mt.formatter.formatFromRequest === 'function'
            );
            const responseFormatters = formatterInstances.filter(
                mt => typeof mt.formatter.formatForResponse === 'function'
            );

            return { requestFormatters, responseFormatters };
        }

        function assertValidFormatter(formatter) {
            if (typeof formatter.formatFromRequest === 'function') {
                return;
            }
            if (typeof formatter.formatForResponse === 'function') {
                return;
            }

            // tslint:disable-next-line max-line-length
            throw new Error(`Formatters must implement formatFromRequest or formatForResponse but ${formatter.constructor.name} has neither.`);
        }

        // tslint:disable-next-line max-line-length
        function validateCanProcessRequest({ req, body, requestFormatter, requestFormatters, responseFormatter, responseFormatters, handler }: any): any {
            if (body && !requestFormatter && requestFormatters.length === 0) {
                // tslint:disable-next-line max-line-length
                throw new HTTPError({ status: 500, message: 'This route is not configured to support Content-Type requests. It must have at least one MediaType with a `formatFromRequest` method, or no MediaTypes to get the default pass through behavior.' });
            }
            if (body && !requestFormatter) {
                // tslint:disable-next-line max-line-length
                throw new HTTPError({ status: 415, message: `The provided Content-Type ${req.headers['content-type']} is not supported. Try one of the supported media types: ${requestFormatters.map((mt) => mt.formatter.mediaType).join(', ')}` });
            }
            const isGetRequest = req.method === 'GET';

            // if its not a GET, then we have no way of bailing early, since it might be a 204,
            // and we might not need a response formatter
            // tslint:disable-next-line max-line-length
            if (isGetRequest && !responseFormatter && responseFormatters.length === 0) {
                // tslint:disable-next-line max-line-length
                throw new HTTPError({ status: 500, message: 'This route is not configured to support Accept responses. It must have at least one MediaType with a `formatForResponse` method to support responses, or no MediaTypes to get the default pass through behavior.' });
            }

            if (isGetRequest && !responseFormatter) {
                // tslint:disable-next-line max-line-length
                throw new HTTPError({ status: 406, message: `The requested Accept format cannot be satisfied. Try one of the supported media types: ${responseFormatters.map((mt) => mt.formatter.mediaType).join(', ')}` });
            }

            if (!handler) {
                // tslint:disable-next-line max-line-length
                throw new HTTPError({ status: 500, message: 'This route is not configured properly. It must have a default handler or handlers provided with each of the media types' });
            }
        }

        function getRequestFormatter({ requestFormatters, req, body }: any): any {
            if (!body) {
                return null;
            }

            for (const mediaTypeFormatter of requestFormatters) {
                // tslint:disable-next-line max-line-length
                if (mediaTypeFormatter.formatter.formatFromRequest && (!mediaTypeFormatter.formatter.mediaType || isAcceptableContentType(mediaTypeFormatter.formatter.mediaType, req))) {
                    return mediaTypeFormatter;
                }
            }
            return null;
        }

        function getResponseFormatter({ responseFormatters, req }: any): any {
            for (const mediaTypeFormatter of responseFormatters) {
                // tslint:disable-next-line max-line-length
                if (!mediaTypeFormatter.formatter.mediaType || isAcceptableMediaType(mediaTypeFormatter.formatter.mediaType, req)) {
                    return mediaTypeFormatter;
                }
            }
        }

        function getHandlerForRequest({ defaultHandler, responseFormatter, requestFormatter }: any): any {
            if (requestFormatter && requestFormatter.handler) {
                return requestFormatter.handler;
            }
            if (responseFormatter && responseFormatter.handler) {
                return responseFormatter.handler;
            }

            return defaultHandler;
        }

        async function handleHTTPResponseModel({
            response,
            model,
        }: any): Promise<void> {
            Object.entries(model.headers || {}).forEach(([headerName, headerValue]) => {
                response.set(headerName, headerValue);
            });
            response.status(model.status);

            if (model.send) {
                await model.send({ res: response });
            } else if (model.body) {
                response.json(model.body);
            } else {
                response.send();
            }
        }
    }
}
