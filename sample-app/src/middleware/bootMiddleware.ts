import * as bodyParser from 'body-parser';

export function bootMiddleware(app: any): void {
  app.use(bodyParser.json({
    type: [
      'application/json',
      '+json'
    ],
    limit: '50mb'
  }));
}
