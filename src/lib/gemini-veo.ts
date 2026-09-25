// Acesso direto à Gemini API (BYOK): a chave do usuário vai só para o Google,
// nunca para o nosso servidor. Contrato: ai.google.dev/gemini-api/docs/veo.
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export const DEFAULT_GEMINI_VIDEO_MODEL = "veo-3.1-generate-preview";

export const GEMINI_VIDEO_MODELS = [
  { id: DEFAULT_GEMINI_VIDEO_MODEL, label: "Veo 3.1", note: "qualidade máxima" },
  { id: "veo-3.1-fast-generate-preview", label: "Veo 3.1 Fast", note: "rápido" },
  { id: "veo-3.1-lite-generate-preview", label: "Veo 3.1 Lite", note: "leve" },
];

export type GeminiImagePart = { mimeType: string; data: string };

export type GeminiVideoParams = {
  model: string;
  prompt: string;
  firstImage?: GeminiImagePart | undefined;
  lastImage?: GeminiImagePart | undefined;
  aspectRatio: "16:9" | "9:16";
  resolution: "720p" | "1080p";
  durationSeconds: 4 | 6 | 8;
  negativePrompt?: string | undefined;
  personGeneration?: "dont_allow" | "allow_adult" | undefined;
  seed?: number | undefined;
};

export type OperationStatus =
  { done: false } | { done: true; uri: string } | { done: true; uri: ""; error: string };

function headers(key: string): HeadersInit {
  return { "x-goog-api-key": key, "Content-Type": "application/json" };
}

async function readError(res: Response, fallback: string): Promise<Error> {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text) as { error?: { message?: string } };
    return new Error(
      json.error?.message ? `Google: ${json.error.message}` : `${fallback} (${res.status})`,
    );
  } catch {
    return new Error(`${fallback} (${res.status}): ${text.slice(0, 160)}`);
  }
}

export async function listGeminiVideoModels(key: string): Promise<{ id: string; label: string }[]> {
  const res = await fetch(`${BASE}/models?key=${encodeURIComponent(key)}`, { method: "GET" });
  if (!res.ok) throw await readError(res, "Falha ao listar modelos");
  const json = (await res.json()) as {
    models?: { name?: string; supportedGenerationMethods?: string[] }[];
  };
  const models = json.models ?? [];
  return models
    .filter(
      (m) =>
        (m.name ?? "").includes("veo") ||
        (m.supportedGenerationMethods ?? []).some((g) => g.toLowerCase().includes("video")),
    )
    .map((m) => ({
      id: (m.name ?? "").replace(/^models\//, ""),
      label: (m.name ?? "").replace(/^models\//, ""),
    }));
}

export async function createGeminiOperation(
  key: string,
  params: GeminiVideoParams,
  signal?: AbortSignal,
): Promise<string> {
  const instance: Record<string, unknown> = { prompt: params.prompt };
  if (params.firstImage) {
    instance["image"] = {
      inlineData: { mimeType: params.firstImage.mimeType, data: params.firstImage.data },
    };
  }
  if (params.lastImage) {
    instance["lastFrame"] = {
      inlineData: { mimeType: params.lastImage.mimeType, data: params.lastImage.data },
    };
  }
  const parameters: Record<string, unknown> = {
    aspectRatio: params.aspectRatio,
    resolution: params.resolution,
    durationSeconds: params.durationSeconds,
  };
  if (params.negativePrompt?.trim()) parameters["negativePrompt"] = params.negativePrompt.trim();
  if (params.personGeneration) parameters["personGeneration"] = params.personGeneration;
  if (typeof params.seed === "number" && Number.isFinite(params.seed))
    parameters["seed"] = params.seed;
  const res = await fetch(`${BASE}/models/${params.model}:predictLongRunning`, {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify({ instances: [instance], parameters }),
    signal: signal ?? null,
  });
  if (!res.ok) throw await readError(res, "Criação falhou");
  const json = (await res.json()) as { name?: string };
  if (!json.name) throw new Error("Google não retornou o id da operação.");
  return json.name;
}

export async function pollGeminiOperation(
  key: string,
  operationName: string,
  signal: AbortSignal,
  onTick: (elapsedSec: number) => void,
): Promise<string> {
  const started = Date.now();
  while (true) {
    signal.throwIfAborted();
    const res = await fetch(`${BASE}/${operationName}`, {
      headers: { "x-goog-api-key": key },
      signal,
    });
    if (!res.ok) throw await readError(res, "Consulta de status falhou");
    const json = (await res.json()) as {
      done?: boolean;
      error?: { message?: string };
      response?: { generateVideoResponse?: { generatedSamples?: { video?: { uri?: string } }[] } };
    };
    onTick(Math.round((Date.now() - started) / 1000));
    if (json.error?.message) throw new Error(`Google: ${json.error.message}`);
    if (json.done) {
      const uri = json.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) throw new Error("Operação concluída sem URI de vídeo.");
      return uri;
    }
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      const t = window.setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, 10000);
      const onAbort = () => {
        window.clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
}

export async function downloadGeminiVideo(
  key: string,
  uri: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const res = await fetch(uri, {
    headers: { "x-goog-api-key": key },
    signal: signal ?? null,
  });
  if (!res.ok) throw await readError(res, "Download falhou");
  return await res.blob();
}

export function fileToInlineData(file: File, maxEdge = 1280): Promise<GeminiImagePart> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) {
        reject(new Error("Canvas indisponível."));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const data = dataUrl.split(",")[1] ?? "";
      resolve({ mimeType: "image/jpeg", data });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não consegui ler essa imagem."));
    };
    img.src = url;
  });
}
