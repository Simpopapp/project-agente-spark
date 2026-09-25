import { DEFAULT_IMAGE_MODEL, IMAGE_MODELS, type ImageFormat } from "@/lib/image-models";

export type ImageConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
  format: ImageFormat;
};

const MODEL_FORMATS: { match: string; format: ImageFormat }[] = [
  { match: "google/gemini-3.1-flash-lite-image", format: "generate-content" },
  { match: "openai/", format: "openai" },
  { match: "google/gemini-", format: "gemini-chat" },
];

export function resolveImageModel(requested: unknown): { model: string; format: ImageFormat } {
  const id = typeof requested === "string" ? requested : "";
  // Só modelos da allowlist descoberta via GET /v1/models; resto cai no padrão.
  const found = IMAGE_MODELS.find((m) => m.id === id);
  const model = found ? found.id : DEFAULT_IMAGE_MODEL;
  const format = MODEL_FORMATS.find((f) => model.startsWith(f.match))?.format ?? "gemini-chat";
  return { model, format };
}

export const imageSettings = {
  baseURL: "https://ai.gateway.lovable.dev",
};

export function generateImage(
  config: ImageConfig,
  prompt: string,
  stream = true,
  signal?: AbortSignal,
) {
  const input =
    config.format === "openai"
      ? { prompt, ...(stream ? { partial_images: 1 } : {}) }
      : config.format === "generate-content"
        ? {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }
        : {
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          };
  return fetch(`${config.baseURL}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: config.model, ...input, ...(stream ? { stream: true } : {}) }),
    signal: signal ?? null,
  });
}
