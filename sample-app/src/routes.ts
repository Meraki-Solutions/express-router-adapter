import { ExpressRouterAdapter } from '@symbiotic/express-router-adapter';

export function applyRoutes(app: any): void {
  const { container } = app;

  container.get(ExpressRouterAdapter).applyRoutes(app);

  app.use((req, res) => {
    res.status(404).json({
      statusCode: 404,
      code: 10,
      message: `The requested resource (${req.path}) was not found.`,
      developerMessage: `The requested resource (${req.path}) was not found in the database. Please check the spelling or id for the resource.`,
      moreInfo: {
        hostname: req.hostname,
        originalUrl: req.originalUrl
      }
    });
  });
}
