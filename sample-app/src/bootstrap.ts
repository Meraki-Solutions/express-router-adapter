import * as express from 'express';
import { getContainer } from './ioc';
import { bootMiddleware } from './middleware/bootMiddleware';
import { errorHandler } from './middleware/errorHandler';
import { applyRoutes } from './routes';

export async function buildExpressApp(): Promise<any> {
  try {
    const container = await getContainer();

    const app = express();

    (app as any).dispose = () => {
      // Any cleanup needed on shutdown, cleaning up connection pools
    };

    (app as any).container = container;
    bootMiddleware(app);
    applyRoutes(app);

    // error handler must be added last
    app.use(errorHandler);

    return app;
  } catch (err) {
    console.error('Failed to create container, exiting app', err);
    const app = express();
    app.use((req, res, next) => { // eslint-disable-line no-unused-vars
      res
        .status(500)
        .json({
          statusCode: 500,
          code: 0,
          message: 'Unexpected error occured.',
          developerMessage: 'Something happened on the server and we have no idea what. Blame the architect.',
          moreInfo: ''
        });
    });

    return app;
  }
}
