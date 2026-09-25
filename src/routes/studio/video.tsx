import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { StudioShell } from "@/components/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_GEMINI_VIDEO_MODEL,
  GEMINI_VIDEO_MODELS,
  createGeminiOperation,
  downloadGeminiVideo,
  fileToInlineData,
  listGeminiVideoModels,
  pollGeminiOperation,
  type GeminiImagePart,
} from "@/lib/gemini-veo";
import { DEFAULT_VIDEO_MODEL, VIDEO_DURATIONS, VIDEO_MODELS } from "@/lib/video-models";

export const Route = createFileRoute("/studio/video")({
  component: VideoPage,
});

type VideoEntry = {
  prompt: string;
  model: string;
  seconds: number;
  jobId: string;
  at: string;
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function loadVideoHistory(): VideoEntry[] {
  try {
    const raw = localStorage.getItem("studio:videos");
    if (raw) return JSON.parse(raw);
  } catch {
    // segue vazio
  }
  return [];
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function LovableIaVideo() {
  const [prompt, setPrompt] = useState("lime disc rotating on dark graphite, cinematic macro");
  const [model, setModel] = useState(DEFAULT_VIDEO_MODEL);
  const [seconds, setSeconds] = useState(8);
  const [jobId, setJobId] = useState("");
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Nada ainda — gere o primeiro vídeo.");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<VideoEntry[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHistory(loadVideoHistory());
    try {
      const saved = localStorage.getItem("studio:video-model");
      if (saved && VIDEO_MODELS.some((m) => m.id === saved)) setModel(saved);
    } catch {
      // segue no padrão
    }
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  function pushHistory(entry: VideoEntry) {
    const next = [entry, ...loadVideoHistory()].slice(0, 12);
    setHistory(next);
    try {
      localStorage.setItem("studio:videos", JSON.stringify(next));
    } catch {
      // segue sem persistir
    }
  }

  async function fetchContent(id: string, signal: AbortSignal): Promise<string> {
    const res = await fetch(`/api/video-content?id=${encodeURIComponent(id)}`, { signal });
    if (!res.ok) throw new Error(`Falha ao baixar o vídeo (${res.status}). Pode ter expirado.`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  async function pollUntilDone(id: string, signal: AbortSignal): Promise<void> {
    while (true) {
      signal.throwIfAborted();
      const res = await fetch(`/api/video-status?id=${encodeURIComponent(id)}`, { signal });
      if (!res.ok) throw new Error(`Status falhou (${res.status}).`);
      const job = (await res.json()) as { status?: string; progress?: number };
      setProgress(typeof job.progress === "number" ? job.progress : 0);
      const st = job.status ?? "unknown";
      setStatusMsg(`Job ${id.slice(-8)} · ${st}`);
      if (st === "completed") return;
      if (st === "failed" || st === "error" || st === "cancelled") {
        throw new Error(`Geração falhou no gateway (status: ${st}).`);
      }
      await sleep(10000, signal);
    }
  }

  async function generate() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    setVideoUrl("");
    setProgress(0);
    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), model, seconds }),
        signal: controller.signal,
      });
      if (!res.ok)
        throw new Error(`Criação falhou (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const job = (await res.json()) as { id?: string };
      if (!job.id) throw new Error("Gateway não retornou o id do job.");
      setJobId(job.id);
      setStatusMsg(
        `Job ${job.id.slice(-8)} · na fila — vídeos levam minutos, sem timeout artificial.`,
      );
      await pollUntilDone(job.id, controller.signal);
      const url = await fetchContent(job.id, controller.signal);
      setVideoUrl(url);
      setStatusMsg("Pronto — MP4 real do gateway.");
      pushHistory({
        prompt: prompt.trim(),
        model,
        seconds,
        jobId: job.id,
        at: new Date().toISOString(),
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setStatusMsg("Cancelado por você — o job pode continuar faturando no gateway.");
      } else {
        setError(e instanceof Error ? e.message : "Falha na geração.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function reopen(entry: VideoEntry) {
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const url = await fetchContent(entry.jobId, controller.signal);
      setVideoUrl(url);
      setJobId(entry.jobId);
      setPrompt(entry.prompt);
      setStatusMsg("Vídeo reaberto do gateway.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao reabrir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Vídeo gerado por IA</CardTitle>
          <CardDescription aria-live="polite">{statusMsg}</CardDescription>
        </CardHeader>
        <CardContent>
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              playsInline
              className="aspect-video w-full rounded-xl border border-border bg-black"
            />
          ) : (
            <div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-accent"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso da geração"
              >
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-6 flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                {loading ? "Gerando — Veo leva minutos…" : "Nenhum vídeo ainda."}
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={generate} disabled={loading || !prompt.trim()}>
              {loading ? `Gerando… ${progress}%` : "Gerar vídeo com IA"}
            </Button>
            {loading && (
              <Button variant="destructive" onClick={() => abortRef.current?.abort()}>
                Cancelar
              </Button>
            )}
            {videoUrl && (
              <Button variant="outline" asChild>
                <a href={videoUrl} download={`studio-video-${jobId}.mp4`}>
                  Baixar MP4
                </a>
              </Button>
            )}
          </div>
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
            >
              {error}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Prompt Veo</CardTitle>
          <CardDescription>Modelo, duração e descrição da cena.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="v-model">Modelo de vídeo</Label>
            <select
              id="v-model"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                try {
                  localStorage.setItem("studio:video-model", e.target.value);
                } catch {
                  // segue sem persistir
                }
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {VIDEO_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} · {m.note}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-prompt">Descreva a cena</Label>
            <Textarea
              id="v-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-seconds">Duração: {seconds}s (720p)</Label>
            <select
              id="v-seconds"
              value={seconds}
              onChange={(e) => setSeconds(Number(e.target.value))}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {VIDEO_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} segundos
                </option>
              ))}
            </select>
          </div>
          <div aria-live="polite">
            <p className="text-xs text-muted-foreground">Histórico ({history.length})</p>
            <ul className="mt-2 space-y-2">
              {history.map((h) => (
                <li key={h.jobId} className="rounded-lg border border-border p-2 text-xs">
                  <button
                    type="button"
                    className="w-full text-left hover:underline"
                    onClick={() => reopen(h)}
                  >
                    {h.prompt.slice(0, 60)} · {h.seconds}s · {h.model.split("/")[1]}
                  </button>
                </li>
              ))}
              {history.length === 0 && (
                <li className="text-xs text-muted-foreground">Nada ainda — gere o primeiro.</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GeminiIaVideo() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [prompt, setPrompt] = useState("lime disc rotating on dark graphite, cinematic macro");
  const [model, setModel] = useState(DEFAULT_GEMINI_VIDEO_MODEL);
  const [customModel, setCustomModel] = useState("");
  const [listed, setListed] = useState<{ id: string; label: string }[]>([]);
  const [listing, setListing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [resolution, setResolution] = useState<"720p" | "1080p">("720p");
  const [seconds, setSeconds] = useState<4 | 6 | 8>(8);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [personGeneration, setPersonGeneration] = useState<"dont_allow" | "allow_adult">(
    "dont_allow",
  );
  const [seedText, setSeedText] = useState("");
  const [firstFile, setFirstFile] = useState<{ part: GeminiImagePart; preview: string } | null>(
    null,
  );
  const [lastFile, setLastFile] = useState<{ part: GeminiImagePart; preview: string } | null>(null);
  const [fileError, setFileError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [statusMsg, setStatusMsg] = useState(
    "Cole sua chave Gemini para começar — ela fica só no seu navegador.",
  );
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("studio:gemini-key");
      if (saved) setApiKey(saved);
    } catch {
      // sem chave salva
    }
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
      if (firstFile) URL.revokeObjectURL(firstFile.preview);
      if (lastFile) URL.revokeObjectURL(lastFile.preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  function saveKey(next: string) {
    setApiKey(next);
    try {
      if (next) localStorage.setItem("studio:gemini-key", next);
      else localStorage.removeItem("studio:gemini-key");
    } catch {
      // segue sem persistir
    }
  }

  async function listFromKey() {
    if (!apiKey.trim()) {
      setError("Cole sua chave Gemini primeiro.");
      return;
    }
    setListing(true);
    setError("");
    try {
      const models = await listGeminiVideoModels(apiKey.trim());
      setListed(models);
      setStatusMsg(
        models.length > 0
          ? `${models.length} modelos de vídeo na sua chave.`
          : "Nenhum modelo de vídeo retornado para esta chave.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao listar.");
    } finally {
      setListing(false);
    }
  }

  async function onFile(
    file: File | undefined,
    setter: (v: { part: GeminiImagePart; preview: string } | null) => void,
  ) {
    setFileError("");
    if (!file) {
      setter(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setFileError("Envie um arquivo de imagem (PNG/JPEG).");
      return;
    }
    try {
      const part = await fileToInlineData(file);
      setter({ part, preview: URL.createObjectURL(file) });
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Falha ao ler imagem.");
    }
  }

  async function generate() {
    const key = apiKey.trim();
    if (!key) {
      setError("Cole sua chave Gemini primeiro (a fatura vai para sua conta Google).");
      return;
    }
    const activeModel = customModel.trim() || model;
    const seedNum = seedText.trim() === "" ? undefined : Number(seedText);
    if (seedText.trim() !== "" && !Number.isInteger(seedNum)) {
      setError("Seed deve ser um número inteiro.");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    setVideoUrl("");
    setElapsed(0);
    try {
      const op = await createGeminiOperation(
        key,
        {
          model: activeModel,
          prompt: prompt.trim(),
          firstImage: firstFile?.part,
          lastImage: lastFile?.part,
          aspectRatio,
          resolution,
          durationSeconds: seconds,
          negativePrompt,
          personGeneration,
          seed: seedNum,
        },
        controller.signal,
      );
      setStatusMsg(`Operação ${op.split("/").pop()} · gerando no Google (leva minutos)…`);
      const uri = await pollGeminiOperation(key, op, controller.signal, (s) => {
        setElapsed(s);
        setStatusMsg(`Gerando no Google… ${s}s decorridos (sem timeout artificial).`);
      });
      const blob = await downloadGeminiVideo(key, uri, controller.signal);
      setVideoUrl(URL.createObjectURL(blob));
      setStatusMsg("Pronto — MP4 real da sua conta Google.");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setStatusMsg("Cancelado por você — o Google pode continuar faturando a operação.");
      } else {
        setError(e instanceof Error ? e.message : "Falha na geração.");
      }
    } finally {
      setLoading(false);
    }
  }

  const allModels = [
    ...GEMINI_VIDEO_MODELS.map((m) => ({ id: m.id, label: `${m.label} · ${m.note}` })),
    ...listed
      .filter((m) => !GEMINI_VIDEO_MODELS.some((g) => g.id === m.id))
      .map((m) => ({ id: m.id, label: m.label })),
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Vídeo via sua chave Gemini</CardTitle>
          <CardDescription aria-live="polite">{statusMsg}</CardDescription>
        </CardHeader>
        <CardContent>
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              playsInline
              className="aspect-video w-full rounded-xl border border-border bg-black"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              {loading ? `Gerando… ${elapsed}s` : "Nenhum vídeo ainda."}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={generate} disabled={loading || !prompt.trim()}>
              {loading ? `Gerando… ${elapsed}s` : "Gerar com minha chave"}
            </Button>
            {loading && (
              <Button variant="destructive" onClick={() => abortRef.current?.abort()}>
                Cancelar
              </Button>
            )}
            {videoUrl && (
              <Button variant="outline" asChild>
                <a href={videoUrl} download={`studio-gemini-${Date.now()}.mp4`}>
                  Baixar MP4
                </a>
              </Button>
            )}
          </div>
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
            >
              {error}
            </p>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Chave e modelo</CardTitle>
            <CardDescription>
              A chave vai direto ao Google do seu navegador — nunca ao nosso servidor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="g-key">Gemini API key</Label>
              <div className="flex gap-2">
                <Input
                  id="g-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => saveKey(e.target.value)}
                  placeholder="AIza…"
                  autoComplete="off"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? "Ocultar chave" : "Mostrar chave"}
                >
                  {showKey ? "Ocultar" : "Ver"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={listFromKey}
                  disabled={listing || !apiKey.trim()}
                >
                  {listing ? "Listando…" : "Listar modelos da chave"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => saveKey("")}>
                  Limpar chave
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-model">Modelo</Label>
              <select
                id="g-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {allModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-custom">Outro modelo (opcional, id exato)</Label>
              <Input
                id="g-custom"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="ex: veo-3.1-fast-generate-preview"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Cena e parâmetros</CardTitle>
            <CardDescription>Prompt, imagens e controles Veo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="g-prompt">Prompt da cena</Label>
              <Textarea
                id="g-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                maxLength={1000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-first">Frame inicial (image-to-video, opcional)</Label>
              <Input
                id="g-first"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => onFile(e.target.files?.[0], setFirstFile)}
              />
              {firstFile && (
                <img
                  src={firstFile.preview}
                  alt="Frame inicial selecionado"
                  className="h-20 rounded-lg border border-border"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-last">Frame final (opcional, 3.1/3.1 Fast)</Label>
              <Input
                id="g-last"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => onFile(e.target.files?.[0], setLastFile)}
              />
              {lastFile && (
                <img
                  src={lastFile.preview}
                  alt="Frame final selecionado"
                  className="h-20 rounded-lg border border-border"
                />
              )}
            </div>
            {fileError && (
              <p role="alert" className="text-xs text-destructive">
                {fileError}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="g-aspect">Proporção</Label>
                <select
                  id="g-aspect"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as "16:9" | "9:16")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                >
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="g-res">Resolução</Label>
                <select
                  id="g-res"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as "720p" | "1080p")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                >
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="g-dur">Duração</Label>
                <select
                  id="g-dur"
                  value={seconds}
                  onChange={(e) => setSeconds(Number(e.target.value) as 4 | 6 | 8)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                >
                  <option value={4}>4s</option>
                  <option value={6}>6s</option>
                  <option value={8}>8s</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-neg">Prompt negativo (opcional)</Label>
              <Input
                id="g-neg"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="ex: cartoon, low quality"
                maxLength={300}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="g-person">Pessoas</Label>
                <select
                  id="g-person"
                  value={personGeneration}
                  onChange={(e) =>
                    setPersonGeneration(e.target.value as "dont_allow" | "allow_adult")
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                >
                  <option value="dont_allow">Sem pessoas</option>
                  <option value="allow_adult">Permitir adultos</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="g-seed">Seed (opcional)</Label>
                <Input
                  id="g-seed"
                  value={seedText}
                  onChange={(e) => setSeedText(e.target.value)}
                  placeholder="ex: 42"
                  inputMode="numeric"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IaVideo() {
  const [provider, setProvider] = useState<"lovable" | "gemini">("gemini");
  return (
    <div>
      <div className="flex gap-2" role="tablist" aria-label="Provedor de vídeo IA">
        {(["gemini", "lovable"] as const).map((p) => (
          <Button
            key={p}
            role="tab"
            aria-selected={provider === p}
            variant={provider === p ? "default" : "outline"}
            onClick={() => setProvider(p)}
          >
            {p === "gemini" ? "Gemini direto (sua chave)" : "Lovable Gateway (créditos)"}
          </Button>
        ))}
      </div>
      <div className="mt-4">{provider === "gemini" ? <GeminiIaVideo /> : <LovableIaVideo />}</div>
    </div>
  );
}

function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function Storyboard() {
  const [title, setTitle] = useState("Studio OS em 20 segundos");
  const [sub, setSub] = useState("Imagem, docs, brand e publish num fluxo só");
  const [seconds, setSeconds] = useState(20);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [count, setCount] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [script, setScript] = useState(
    "Studio OS em 20 segundos. Imagem, docs, brand e publish num fluxo só.",
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [audioNote, setAudioNote] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("studio:storyboards");
      if (raw) setCount(JSON.parse(raw).length);
    } catch {
      setCount(0);
    }
    if (!speechSupported()) {
      setAudioNote("Narração indisponível neste navegador.");
      return;
    }
    const load = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) {
        setVoices(list);
        setVoiceURI((prev) => {
          if (prev && list.some((v) => v.voiceURI === prev)) return prev;
          const preferred = list.find((v) => v.lang.toLowerCase().startsWith("pt")) ?? list[0];
          return preferred ? preferred.voiceURI : "";
        });
      }
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (t >= seconds) {
      setPlaying(false);
      if (speechSupported()) window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const id = window.setTimeout(() => setT((v) => Math.min(seconds, v + 0.1)), 100);
    return () => window.clearTimeout(id);
  }, [playing, t, seconds]);

  const pct = seconds === 0 ? 0 : Math.round((t / seconds) * 100);

  function speak(text: string) {
    if (!speechSupported() || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = voices.find((v) => v.voiceURI === voiceURI);
    if (voice) utter.voice = voice;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }

  function stopSpeech() {
    if (speechSupported()) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      stopSpeech();
    } else {
      if (t >= seconds) setT(0);
      setPlaying(true);
      if (audioEnabled && speechSupported() && script.trim()) speak(script);
      else if (audioEnabled && !speechSupported())
        setAudioNote("Narração indisponível neste navegador.");
    }
  }

  function restart() {
    setPlaying(false);
    stopSpeech();
    setT(0);
  }

  function saveBoard() {
    const board = {
      title,
      sub,
      seconds,
      scenes: [
        { at: 0, text: title },
        { at: Math.round(seconds / 2), text: sub },
        { at: seconds, text: "Studio OS · crie e publique" },
      ],
      audio: {
        enabled: audioEnabled,
        script,
        voice: voices.find((v) => v.voiceURI === voiceURI)?.name ?? "",
        lang: voices.find((v) => v.voiceURI === voiceURI)?.lang ?? "",
        rate,
        pitch,
      },
      createdAt: new Date().toISOString(),
    };
    try {
      const raw = localStorage.getItem("studio:storyboards");
      const list = raw ? JSON.parse(raw) : [];
      const next = [board, ...list].slice(0, 12);
      localStorage.setItem("studio:storyboards", JSON.stringify(next));
      setCount(next.length);
    } catch {
      // segue sem persistir
    }
    downloadJson("storyboard.json", board);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Player do storyboard</CardTitle>
            <CardDescription aria-live="polite">
              {playing
                ? `Tocando · ${t.toFixed(1)}s de ${seconds}s (${pct}%)${speaking ? " · narrando" : ""}`
                : "Pausado · aperte play"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border bg-black">
              <div className="relative aspect-video w-full">
                <div
                  className="absolute inset-0 transition-transform duration-300"
                  style={{
                    transform: `translateX(-${pct}%)`,
                    background: "linear-gradient(100deg,#0a0a0b 30%,#1d2b12 55%,#c8ff2e 130%)",
                    width: "200%",
                  }}
                />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <p className="font-display text-2xl font-bold text-white md:text-3xl">{title}</p>
                  <p className="font-serif-accent mt-1 text-base text-lime-200">{sub}</p>
                  <div
                    className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/20"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progresso do teaser"
                  >
                    <div className="h-full bg-lime-300" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={togglePlay}>{playing ? "Pausar" : "Play"}</Button>
              <Button variant="outline" onClick={restart}>
                Reiniciar
              </Button>
              <Button variant="secondary" onClick={saveBoard}>
                Salvar + baixar storyboard ({count})
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Áudio · narração</CardTitle>
            <CardDescription aria-live="polite">
              {audioNote ||
                (speaking ? "Narrando agora…" : `${voices.length} vozes no dispositivo`)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                id="v-audio-on"
                type="checkbox"
                checked={audioEnabled}
                onChange={(e) => {
                  setAudioEnabled(e.target.checked);
                  if (!e.target.checked) stopSpeech();
                }}
                className="h-4 w-4 accent-lime-300"
              />
              <Label htmlFor="v-audio-on">Narrar roteiro junto com o play</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-script">Texto narrado</Label>
              <Textarea
                id="v-script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-voice">Voz ({voices.length || "carregando…"})</Label>
              <select
                id="v-voice"
                value={voiceURI}
                onChange={(e) => setVoiceURI(e.target.value)}
                disabled={voices.length === 0}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} · {v.lang}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="v-rate">Velocidade: {rate.toFixed(1)}x</Label>
                <Input
                  id="v-rate"
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v-pitch">Tom: {pitch.toFixed(1)}</Label>
                <Input
                  id="v-pitch"
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={pitch}
                  onChange={(e) => setPitch(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => speak(script)} disabled={!script.trim()}>
                Testar voz
              </Button>
              {speaking && (
                <Button variant="destructive" onClick={stopSpeech}>
                  Parar narração
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Roteiro</CardTitle>
          <CardDescription>Base do prompt do Veo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="v-title">Título</Label>
            <Input
              id="v-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-sub">Subtítulo</Label>
            <Input
              id="v-sub"
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-sec">Duração do preview: {seconds}s</Label>
            <Input
              id="v-sec"
              type="range"
              min={5}
              max={60}
              value={seconds}
              onChange={(e) => {
                setSeconds(Number(e.target.value));
                restart();
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VideoPage() {
  const [tab, setTab] = useState<"ia" | "board">("ia");
  return (
    <StudioShell>
      <Badge variant="secondary">Vídeo · IA Veo real + storyboard</Badge>
      <h1 className="font-display mt-3 text-3xl font-bold">Geração de vídeo</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Aba IA gera MP4 de verdade via Veo no gateway (leva minutos). Aba storyboard planeja a cena
        com preview e narração.
      </p>
      <div className="mt-4 flex gap-2" role="tablist" aria-label="Modo de vídeo">
        {(["ia", "board"] as const).map((m) => (
          <Button
            key={m}
            role="tab"
            aria-selected={tab === m}
            variant={tab === m ? "default" : "outline"}
            onClick={() => setTab(m)}
          >
            {m === "ia" ? "IA (Veo)" : "Storyboard + narração"}
          </Button>
        ))}
      </div>
      <div className="mt-4">{tab === "ia" ? <IaVideo /> : <Storyboard />}</div>
    </StudioShell>
  );
}
