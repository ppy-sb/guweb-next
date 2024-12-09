import { type ChatProvider } from '$base/server'

export enum EventType {
  ServerMessage,
  PrivateMessage,
}

export type Event =
| [EventType.ServerMessage, { content: string; href?: { name: string } }]
| [EventType.PrivateMessage, ChatProvider.IPrivateMessage<string>]
