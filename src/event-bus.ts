// Central event bus connecting hook-receiver → session-manager → ws-hub

import { EventEmitter } from 'node:events';

export interface HookEvent {
  session_id: string;
  tmux_target?: string;
  [key: string]: unknown;
}

export type HookEventType =
  | 'hook:stop'
  | 'hook:notification'
  | 'hook:session-start'
  | 'hook:pretooluse'
  | 'hook:permission';

export interface TypedEventBus {
  emit(event: HookEventType, data: HookEvent): boolean;
  on(event: HookEventType, listener: (data: HookEvent) => void): this;
  off(event: HookEventType, listener: (data: HookEvent) => void): this;
}

const bus = new EventEmitter() as EventEmitter & TypedEventBus;
bus.setMaxListeners(20);

export { bus };
