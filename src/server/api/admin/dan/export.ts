import { assertHaveSession } from '~/server/middleware/0.session'
import { assertLoggedIn } from '~/server/middleware/1.user'
import { assertIsAdmin } from '~/server/middleware/2.admin'
import { dans } from '~/server/singleton/service'
import { GucchoError } from '~/def/messages'

export default defineEventHandler(async (event) => {
  try {
    assertHaveSession(event)
    assertLoggedIn(event)
    assertIsAdmin(event)

    const data = await dans.exportAll()

    // user download data
    event.node.res.setHeader('Content-Type', 'application/json')
    event.node.res.setHeader('Content-Disposition', `attachment; filename="dans-${new Date().getTime()}.json"`)
    event.node.res.end(JSON.stringify(data))
  }
  catch (e) {
    throwGucchoError(GucchoError.RequireAdminPrivilege)
  }
})
