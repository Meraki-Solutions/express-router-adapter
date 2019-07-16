import { ILog } from './ILog';

export class Log implements ILog {
  info(...params: any): void {
    console.info(...params); // tslint:disable-line no-console
  }
  debug(...params: any): void {
    if (process.env.LOG_LEVEL === 'DEBUG') {
      console.debug(...params); // tslint:disable-line no-console
    }
  }
}
