import { resolve } from 'node:path'
import { type UserBackendConfig } from './src/def/config'
import { env, safeEnv } from './src/server/common/utils'

/*
 * This file holds the configuration settings for the Guccho backend. It is advised to use
 * an editor that supports Typescript files for better error detection during editing.
 *
 * Environment Variables Handling:
 * The functions `env()` and `safeEnv()` are used for runtime retrieval of environment variables.
 *
 * - `safeEnv()`: This function fetches environment variables. If a variable is not set, it returns undefined.
 *   You can set a default value using `env(variableName) ?? defaultValue`. For instance, to default
 *   to a local Redis server when REDIS_URL is absent, use `safeEnv('REDIS_URL') ?? 'redis://localhost'`.
 *
 * - `env()`: This is used for mandatory environment variables. The absence of such a variable will
 *   prevent Guccho from launching. This is typically used for essential credentials like database connections.
 *   Example usage: `env('DB_DSN')`.
 *
 * Path Helpers:
 * - `resolve()`: This function is used to convert relative paths into absolute ones. This is important when
 *   starting Guccho from a directory other than the root, as relative paths might otherwise point to incorrect
 *   locations. You can also use an absolute path, which starts with '/' in Linux/Unix or 'C:\\' in Windows.
 */

export default {
  // see supported platforms in readme.md and choose an backend adapter.
  use: 'ppy.sb@bancho.py',
  article: {
    /* were to put articles?
     * must be a resolved path. Put absolute path or use 'resolve()' here.
     */
    location: resolve('articles'),
  },

  sessionStore: 'redis',
  leaderboardSource: 'database',

  redisURL: safeEnv('REDIS_URL') ?? 'redis://localhost',
  dsn: env('DB_DSN'),
  replica: env('DB_REPLICA_DSN'),
  setReplicaBinlogFormat: true,

  avatar: {
    // must be a resolved path. Put absolute path or use 'resolve()' here.
    location: resolve('.dump/ppy.sb/avatar'),
    domain: 'a.ppy.sb',
  },

  api: {
    v1: 'http://api.dev.ppy.sb/v1',
  },

  mail: {
    type: 'smtp',
    auth: 'smtps://account:password@server',
    sender: 'pe@ppy.sb',
  },

} satisfies UserBackendConfig
