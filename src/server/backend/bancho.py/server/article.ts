import { ArticleProvider as Base } from '$base/server/article'
import type { UserCompact } from '~/def/user'

export class ArticleProvider extends Base {
  async get(opt: { slug: string; fallback: boolean; user?: UserCompact<unknown> }) {
    const content = await this.getLocal(opt)
    if (!content) {
      return undefined
    }

    const [read, write] = await Promise.all([ArticleProvider.checkPrivilege('read', content, opt.user), ArticleProvider.checkPrivilege('write', content, opt.user)])
    return Object.assign(content, {
      access: {
        read,
        write,
      },
    })
  }

  async save(opt: {
    slug: string
    json: Base.JSONContent
    user: UserCompact<unknown>
    privilege: Base.Meta['privilege']
    dynamic: boolean
  }) {
    return this.saveLocal(opt)
  }
}
export namespace ArticleProvider {
  export type JSONContent = Base.JSONContent
}
