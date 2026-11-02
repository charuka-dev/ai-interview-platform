// Vapi client wrapper — initialises the SDK once and exposes a typed singleton.
// Components talk to `vapiClient` directly; the call object is available as
// `vapiClient.vapi` for event subscriptions (volume-level, message, etc.)

import Vapi from "@vapi-ai/web";

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined;

// Lazily initialised singleton
let _vapi: Vapi | null = null;

function getVapi(): Vapi {
  if (!_vapi) {
    if (!VAPI_PUBLIC_KEY) {
      throw new Error(
        "VITE_VAPI_PUBLIC_KEY is not set. Add it to frontend/.env.local and restart the dev server."
      );
    }
    const VapiClass = (Vapi as any).default || Vapi;
    _vapi = new VapiClass(VAPI_PUBLIC_KEY);
  }
  return _vapi!;
}

export type CallStatus = "idle" | "connecting" | "active" | "ending" | "ended";

export const vapiClient = {
  get vapi(): Vapi {
    return getVapi();
  },

  /** Start a call with a pre-built Vapi assistant. */
  async startAssistant(assistantId: string): Promise<void> {
    await getVapi().start(assistantId);
  },

  /** Mute or unmute the user's microphone. */
  setMuted(muted: boolean): void {
    getVapi().setMuted(muted);
  },

  isMuted(): boolean {
    return getVapi().isMuted();
  },

  /** Gracefully end the active call. */
  stop(): void {
    getVapi().stop();
  },
};
