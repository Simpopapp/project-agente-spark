export type VideoModelFamily = "veo" | "omni";

// Lineup espelhando o Google Flow: Veo 3.1 (+ Fast + Lite) e Gemini Omni.
// IDs Lovable exatos da descoberta autenticada GET /v1/models.
export const VIDEO_MODELS: { id: string; label: string; note: string; family: VideoModelFamily }[] =
  [
    { id: "google/veo-3.1-fast", label: "Veo 3.1 Fast", note: "rápido · padrão", family: "veo" },
    { id: "google/veo-3.1-lite", label: "Veo 3.1 Lite", note: "leve", family: "veo" },
    { id: "google/veo-3.1", label: "Veo 3.1", note: "qualidade máxima", family: "veo" },
    {
      id: "google/gemini-omni-1.1-flash",
      label: "Gemini Omni Flash",
      note: "edita de qualquer referência",
      family: "omni",
    },
  ];

export const DEFAULT_VIDEO_MODEL = "google/veo-3.1-fast";
export const VIDEO_DURATIONS = [4, 6, 8];
export const VIDEO_SIZE = "1280x720";
