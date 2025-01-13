import { BaseDanProcessor } from './$base'

export class NoopDanProcessor extends BaseDanProcessor implements BaseDanProcessor {
  async init() {}
  async dispose() {}
}
