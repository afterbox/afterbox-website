/**
 * The Ably connection: @ably/pubsub-device (not the `ably` package), authenticated with a subscribe-only token from
 * POST /v1/realtime/token on the member's own channel `private:user:<id>`. Events carry ids, counts and statuses
 * only. Publishing is best effort: the routes stay the source of truth, so a reconnect refetches what's live.
 */

import type { RealtimeEvent } from "@/lib/api/types";
import { api } from "@/lib/api/client";

type Message = { name?: string; data?: unknown };
type Connection = { close: () => void; userId: string };

let connection: Connection | null = null;

export type RealtimeHandlers = {
  onEvent: (event: RealtimeEvent) => void;
  /** After a dropped connection comes back (missed events aren't sent again). */
  onReconnect: () => void;
};

export async function connectRealtime(userId: string, handlers: RealtimeHandlers) {
  if (connection?.userId === userId) return;
  disconnectRealtime();
  const placeholder: Connection = { userId, close: () => {} };
  connection = placeholder;

  const { createClient } = await import("@ably/pubsub-device");
  if (connection !== placeholder) return;

  const client = createClient({
    clientId: userId,
    authCallback: (_params, callback) => {
      api
        .post<Record<string, unknown>>("/v1/realtime/token")
        .then((tokenRequest) => callback(null, tokenRequest as never))
        .catch(() => callback("Realtime token unavailable", null));
    },
    // Our own channel only; no echo, no presence.
    echoMessages: false,
  });

  let connectedOnce = false;
  client.connection.on("connected", () => {
    if (connectedOnce) handlers.onReconnect();
    connectedOnce = true;
  });

  const channel = client.channels.get(`private:user:${userId}`);
  channel.subscribe((message: Message) => {
    if (!message.name) return;
    handlers.onEvent({ name: message.name, data: message.data ?? {} } as RealtimeEvent);
  });

  placeholder.close = () => {
    channel.unsubscribe();
    client.close();
  };
}

export function disconnectRealtime() {
  connection?.close();
  connection = null;
}
