/**
 * Vapi Service — REST API integration for voice interview orchestration.
 *
 * Accesses Vapi's API directly (no SDK). The API key is kept server-side only.
 * The frontend receives only the assistantId, then starts the call via the
 * Vapi Web SDK using a publishable key (separate from this private key).
 */

const VAPI_API_BASE = "https://api.vapi.ai";
const VAPI_API_KEY = process.env.VAPI_API_KEY ?? "";

// Validate PUBLIC_SERVER_URL eagerly so misconfiguration surfaces at startup,
// not mid-call with an opaque Vapi API error.
const _rawPublicServerUrl = process.env.PUBLIC_SERVER_URL;
if (!_rawPublicServerUrl) {
  throw new Error(
    "PUBLIC_SERVER_URL is not set in .env — required for Vapi webhook configuration. " +
    "Use your ngrok URL in local dev (e.g. https://abc123.ngrok-free.app) " +
    "or your real domain in production."
  );
}
// Strip any accidental trailing slash so the path join never produces a double slash.
const PUBLIC_SERVER_URL = _rawPublicServerUrl.replace(/\/+$/, "");

interface CreateAssistantOptions {
  name: string;
  systemPrompt: string;
  firstMessage: string;
}

interface VapiAssistant {
  id: string;
  name: string;
  createdAt: string;
}

async function vapiRequest<T>(
  method: "GET" | "POST" | "DELETE" | "PATCH",
  path: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(`${VAPI_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vapi API error [${response.status}]: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

export const vapiService = {
  /**
   * Creates a Vapi assistant configured for a specific interview session.
   *
   * Uses Gemini Flash as the model provider for real-time, low-latency
   * conversational turn-taking during the live interview.
   */
  async createAssistant(options: CreateAssistantOptions): Promise<VapiAssistant> {
    return vapiRequest<VapiAssistant>("POST", "/assistant", {
      name: options.name,
      firstMessage: options.firstMessage,
      model: {
        provider: "google",
        model: process.env.GEMINI_FLASH_MODEL ?? "gemini-3-flash",
        systemPrompt: options.systemPrompt,
        temperature: 0.7,
        maxTokens: 256, // Keep responses concise for real-time conversation
      },
      voice: {
        provider: "11labs",
        voiceId: "sarah", // Default — can be made configurable per user preference
      },
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en",
      },
      endCallFunctionEnabled: true,
      recordingEnabled: true,
      serverUrl: `${PUBLIC_SERVER_URL}/api/webhooks/vapi`,
      serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET ?? "",
    });
  },

  /**
   * Delete a Vapi assistant — call after session ends or on error cleanup.
   */
  async deleteAssistant(assistantId: string): Promise<void> {
    await vapiRequest<unknown>("DELETE", `/assistant/${assistantId}`);
  },

  /**
   * Retrieve details of an existing Vapi assistant.
   */
  async getAssistant(assistantId: string): Promise<VapiAssistant> {
    return vapiRequest<VapiAssistant>("GET", `/assistant/${assistantId}`);
  },
};
