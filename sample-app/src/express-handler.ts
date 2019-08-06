import * as awsServerlessExpress from 'aws-serverless-express';
import { buildExpressApp } from './bootstrap';

exports.handler = (event, context): any => {
  buildExpressApp().then((app) => {
    // no error handler b/c buildExpressApp should never throw
    const server = awsServerlessExpress.createServer(app);
    awsServerlessExpress.proxy(server, event, context);
  });
};
