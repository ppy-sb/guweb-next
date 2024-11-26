export interface Rec {
  id: string | number
  message: string
  onClick?: () => void
  onClose?: () => void
}
const messages = ref<Map<string | number, Rec[]>>(new Map())

export default function () {
  return {
    messages,
    push(ctx: string | number, msg: Rec) {
      if (!msg) {
        return
      }
      if (!messages.value.has(ctx)) {
        messages.value.set(ctx, [msg])
      }
      else {
        messages.value.get(ctx)!.push(msg)
      }
    },
  }
}
