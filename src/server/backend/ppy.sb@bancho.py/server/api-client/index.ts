import { createFetch } from '../../../bancho.py/api-client'

import type { Id } from '../../'

export async function chatNotify(user: Id, config: { api: { sb: string } }) {
  const sb = createFetch(config.api.sb)
  await sb(`/players${user}/notify`, { method: 'post' })
}
