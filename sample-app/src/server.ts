import { spawn } from 'child_process';
import * as enableDestroy from 'server-destroy';
import { hotReload } from './hot-reload';

const port = process.env.PORT || 4000;
let activeServer;

async function start(): Promise<void> {
  // NOTE: it is very important that require('./bootstrap')
  //  or any other modules you want hot reloaded are required within start.
  //  The way hot reloading works, is it deletes all modules, and then start
  //  is called again to re load them.

  // tslint:disable-next-line: no-require-imports
  const app = await require('./bootstrap').buildExpressApp();

  activeServer = await new Promise((resolve, reject) => {
    const server = app.listen(port, (err) => {
      if (err) {
        reject(err);
      } else {
        server.wlDispose = () => {
          try {
            if (app.dispose) {
              app.dispose();
            }
          } catch (disposeError) {
            console.log('error while disposing', disposeError);
          }
        };

        console.log('Running on http://localhost:' + port);
        resolve(server);
      }
    });
    enableDestroy(server);
  });
}

async function restart(): Promise<void> {
  await new Promise((resolve, reject) => {
    if (!activeServer) {
      resolve();
    } else {
      activeServer.wlDispose();
      activeServer.destroy((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }

  });
  activeServer = undefined;
  await start();
}

start();

hotReload({
  onReload: () => {
    restart();
  },
  watchPaths: [
    {
      path: './build',
      isRequireCacheKeyInPath: (key) => /build/.test(key)
    }
  ]
});

// Spawn babel watch and log any errors
spawn('./node_modules/.bin/tsc', ['-w', '-p', 'tsconfig.json'])
  .stderr.pipe(process.stderr);
