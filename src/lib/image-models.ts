export type ImageFormat = "openai" | "gemini-chat" | "generate-content";

export type ImageModel = { id: string; label: string; note: string };

// Allowlist exata da descoberta autenticada GET /v1/models (55 modelos, 8 com output image).
// O formato segue references/request-formats.md; gemini-2.5-flash-image provado com gemini-chat.
export const DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image";

// Allowlist exata da descoberta autenticada GET /v1/models (55 modelos, 8 com output image).
// O formato segue references/request-formats.md; gemini-2.5-flash-image provado com gemini-chat.
export const IMAGE_MODELS: ImageModel[] = [
  { id: DEFAULT_IMAGE_MODEL, label: "Nano Banana", note: "Gemini 2.5 Flash Image · padrão" },
  { id: "google/gemini-3.1-flash-image", label: "Nano Banana Pro", note: "Gemini 3.1 Flash Image" },
  { id: "google/gemini-3.1-flash-lite-image", label: "Gemini 3.1 Flash Lite Image", note: "leve" },
  { id: "google/gemini-3-pro-image", label: "Gemini 3 Pro Image", note: "qualidade máxima" },
  { id: "openai/gpt-image-1-mini", label: "GPT Image 1 Mini", note: "rápido" },
  { id: "openai/gpt-image-2", label: "GPT Image 2", note: "padrão OpenAI" },
  { id: "openai/gpt-image-2.5-flare", label: "GPT Image 2.5 Flare", note: "detalhado" },
  { id: "openai/gpt-image-2.5-sunburst", label: "GPT Image 2.5 Sunburst", note: "detalhado" },
];
