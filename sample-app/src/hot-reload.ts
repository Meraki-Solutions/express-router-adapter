import * as chokidar from 'chokidar';
import { debounce } from 'lodash';

export function hotReload({ watchPaths, onReload, debounceMilliseconds = 500 }: any): void {
  const watcher = chokidar.watch(watchPaths.map((subject) => subject.path));

  watcher.on('ready', () => {
    watcher.on('all', debounce(() => {
      console.log('Reloading...');
      evictWatchSubjectRequireCache(watchPaths);
      try {
        onReload();
      } catch (e) {
        console.error(e);
      }
    }, debounceMilliseconds));
  });
}

function evictWatchSubjectRequireCache(subjects: any): void {
  Object.keys(require.cache)
    .filter((key) => {
      return subjects.filter((subject) => subject.isRequireCacheKeyInPath(key)).length > 0;
    })
    .forEach((key) => {
      delete require.cache[key];
    });
}
