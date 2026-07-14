declare module 'laravel-echo' {
  import { Channel as PusherChannel, PresenceChannel } from 'pusher-js'

  export interface Channel extends PusherChannel {
    listen(event: string, callback: (data: unknown) => void): this
    stopListening(event: string, callback?: (data: unknown) => void): this
  }

  export default class Echo {
    constructor(options: {
      broadcaster: string
      key: string
      wsHost?: string
      wsPort?: number
      wssPort?: number
      forceTLS?: boolean
      enabledTransports?: string[]
      disableStats?: boolean
      authorizer?: (channel: { name: string }) => {
        authorize: (
          socketId: string,
          callback: (error: Error | null, data: unknown) => void
        ) => void
      }
    })
    channel(channel: string): Channel
    private(channel: string): Channel
    presence(channel: string): PresenceChannel
    leave(channel: string): void
    socketId(): string
    disconnect(): void
    listen(channel: string, event: string, callback: (data: unknown) => void): Channel
  }
}
