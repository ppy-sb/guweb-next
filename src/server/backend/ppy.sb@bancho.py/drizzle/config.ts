import { fileURLToPath } from 'node:url'
import { relative } from 'node:path'
import { defineConfig } from 'drizzle-kit'
import conf from '../../bancho.py/drizzle/config'

const migrationsPath = fileURLToPath(new URL('./migrations', import.meta.url))
// Remove after this bug is fixed: https://github.com/drizzle-team/drizzle-kit-mirror/issues/81
// eslint-disable-next-line n/prefer-global/process
const migrationsRelativePath = relative(process.cwd(), migrationsPath)
export default defineConfig({
  ...conf,
  schema: fileURLToPath(new URL('./schema.ts', import.meta.url)),
  out: migrationsRelativePath,
})
