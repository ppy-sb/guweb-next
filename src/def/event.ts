import { type ChatProvider } from '$base/server'

export enum EventType {
  ServerMessage = 'notify',
  PrivateMessage = 'pm',
}

export type Event =
| [EventType.ServerMessage, { content: string; href?: { name: string } }]
| [EventType.PrivateMessage, ChatProvider.IPrivateMessage<string>]
