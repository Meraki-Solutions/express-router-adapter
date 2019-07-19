export function errorHandler(err: any, req: any, res: any, next: any): void { // eslint-disable-line no-unused-vars

  const {
    status = 500,
    message = 'Server Error'
  } = err;
  if (status >= 500) {
    console.log('failed to process request', req.method, req.path);
    console.error('error handler error', err);
  }

  let requestLogMessage = `${status} ${req.method} ${req.url}`;
  if (req.expressRouterAdapter && req.expressRouterAdapter.securityContext) {
    requestLogMessage += ` (${req.expressRouterAdapter.securityContext.toLogSafeString()})`;
  }

  console.log(requestLogMessage);

  res.status(status)
    .json({
      status,
      message
    });
}
