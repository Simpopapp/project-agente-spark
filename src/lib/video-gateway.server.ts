import { DEFAULT_VIDEO_MODEL, VIDEO_MODELS } from "@/lib/video-models";

const BASE = "https://ai.gateway.lovable.dev";

export type VideoJob = {
  id: string;
  object: string;
  model: string;
  status: string;
  progress?: number;
  seconds?: string;
  size?: string;
};

export function resolveVideoModel(requested: unknown): { model: string; family: "veo" | "omni" } {
  const id = typeof requested === "string" ? requested : "";
  const found = VIDEO_MODELS.find((m) => m.id === id);
  if (found) return { model: found.id, family: found.family };
  return { model: DEFAULT_VIDEO_MODEL, family: "veo" };
}

export function resolveDuration(requested: unknown): number {
  const n = typeof requested === "number" ? requested : Number(requested);
  return n === 4 || n === 6 || n === 8 ? n : 8;
}

export function isValidJobId(id: string): boolean {
  return /^[A-Za-z0-9_-]{4,80}$/.test(id);
}

function apiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" };
}

export async function createVideoJob(
  prompt: string,
  model: string,
  family: "veo" | "omni",
  seconds: number,
  signal?: AbortSignal,
): Promise<Response> {
  // Omni usa o corpo Interactions (contrato provado: input + response_format);
  // Veo usa prompt/seconds/size. Mesmos endpoints de job/status/content.
  const body =
    family === "omni"
      ? {
          model,
          input: prompt,
          response_format: { type: "video", resolution: "720p", duration: `${seconds}s` },
        }
      : { model, prompt, seconds, size: "1280x720" };
  return fetch(`${BASE}/v1/videos`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
    signal: signal ?? null,
  });
}

export async function getVideoJob(id: string, signal?: AbortSignal): Promise<Response> {
  return fetch(`${BASE}/v1/videos/${id}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    signal: signal ?? null,
  });
}

export async function getVideoContent(id: string, signal?: AbortSignal): Promise<Response> {
  return fetch(`${BASE}/v1/videos/${id}/content`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    signal: signal ?? null,
  });
}
