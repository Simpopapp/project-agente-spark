import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { StudioShell } from "@/components/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_IMAGE_MODEL, IMAGE_MODELS } from "@/lib/image-models";
import { streamImage } from "@/lib/stream-image";

export const Route = createFileRoute("/studio/image")({
  component: ImagePage,
});

type Entry = { prompt: string; at: string; seed: number; kind: "ia" | "local" };

function hashPrompt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function drawArt(canvas: HTMLCanvasElement, seed: number, prompt: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const hue1 = seed % 360;
  const hue2 = (hue1 + 70) % 360;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hue1} 60% 12%)`);
  g.addColorStop(0.55, `hsl(${(hue1 + 40) % 360} 70% 20%)`);
  g.addColorStop(1, `hsl(${hue2} 80% 45%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  let rnd = seed || 7;
  const next = () => {
    rnd = (Math.imul(rnd, 1103515245) + 12345) & 0x7fffffff;
    return rnd / 0x7fffffff;
  };
  for (let i = 0; i < 26; i++) {
    const x = next() * w;
    const y = next() * h;
    const r = 12 + next() * 110;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${(hue2 + i * 9) % 360} 85% ${55 + next() * 20}% / ${0.16 + next() * 0.3})`;
    ctx.fill();
  }
  ctx.fillStyle = "rgba(10,10,11,0.55)";
  ctx.fillRect(0, h - 120, w, 120);
  ctx.fillStyle = "#f5f4ef";
  ctx.font = "700 34px 'Space Grotesk', sans-serif";
  ctx.fillText(prompt.slice(0, 28) || "Studio OS", 28, h - 68);
  ctx.fillStyle = "#c8ff2e";
  ctx.font = "500 18px Inter, sans-serif";
  ctx.fillText(`seed ${seed} · ${new Date().getFullYear()}`, 28, h - 34);
}

function loadHistory(): Entry[] {
  try {
    const raw = localStorage.getItem("studio:images");
    if (raw) return JSON.parse(raw);
  } catch {
    // armazenamento indisponível
  }
  return [];
}

function ImagePage() {
  const [mode, setMode] = useState<"ia" | "local">("ia");
  const [prompt, setPrompt] = useState("lime poster art on dark graphite, minimal geometric");
  const [seed, setSeed] = useState(() => hashPrompt("aurora lima sobre grafite"));
  const [history, setHistory] = useState<Entry[]>([]);
  const [iaUrl, setIaUrl] = useState("");
  const [iaFinal, setIaFinal] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaError, setIaError] = useState("");
  const [model, setModel] = useState(DEFAULT_IMAGE_MODEL);
  const abortRef = useRef<AbortController | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
    try {
      const saved = localStorage.getItem("studio:image-model");
      if (saved && IMAGE_MODELS.some((m) => m.id === saved)) setModel(saved);
    } catch {
      // segue no padrão
    }
  }, []);

  useEffect(() => {
    if (mode === "local" && canvasRef.current) drawArt(canvasRef.current, seed, prompt);
  }, [mode, seed, prompt]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function pushHistory(entry: Entry) {
    const nextHistory = [entry, ...loadHistory()].slice(0, 12);
    setHistory(nextHistory);
    try {
      localStorage.setItem("studio:images", JSON.stringify(nextHistory));
    } catch {
      // segue sem persistir
    }
  }

  function generateLocal() {
    const s = hashPrompt(prompt.trim() || "studio");
    setSeed(s);
    pushHistory({ prompt: prompt.trim(), at: new Date().toISOString(), seed: s, kind: "local" });
  }

  async function generateIA() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIaLoading(true);
    setIaFinal(false);
    setIaError("");
    try {
      await streamImage(
        "/api/generate-image",
        { prompt: prompt.trim(), model },
        (dataUrl, isFinal) => {
          setIaUrl(dataUrl);
          setIaFinal(isFinal);
        },
        controller.signal,
      );
      pushHistory({
        prompt: prompt.trim(),
        at: new Date().toISOString(),
        seed: hashPrompt(prompt.trim()),
        kind: "ia",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setIaError("Geração interrompida por você.");
      } else {
        setIaError(error instanceof Error ? error.message : "Falha na geração.");
      }
    } finally {
      setIaLoading(false);
    }
  }

  function downloadLocal() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `studio-local-${seed}.png`;
    a.click();
  }

  function downloadIA() {
    if (!iaUrl) return;
    const a = document.createElement("a");
    a.href = iaUrl;
    a.download = `studio-ia-${Date.now()}.png`;
    a.click();
  }

  return (
    <StudioShell>
      <Badge variant="secondary">Imagem · IA real via gateway + canvas local</Badge>
      <h1 className="font-display mt-3 text-3xl font-bold">Gerador de imagem</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Modo IA chama <code>/api/generate-image</code> com streaming e preview progressivo. Modo
        local desenha no canvas sem custo. Ambos baixam PNG e entram no histórico.
      </p>

      <div className="mt-4 flex gap-2" role="tablist" aria-label="Modo de geração">
        {(["ia", "local"] as const).map((m) => (
          <Button
            key={m}
            role="tab"
            aria-selected={mode === m}
            variant={mode === m ? "default" : "outline"}
            onClick={() => setMode(m)}
          >
            {m === "ia" ? "IA (gateway)" : "Local (canvas)"}
          </Button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">
              {mode === "ia" ? "Resultado da IA" : "Preview vivo"}
            </CardTitle>
            <CardDescription>
              {mode === "ia"
                ? "Parciais com blur, final nítida. Sem timers artificiais."
                : "1024 × 640 · redesenha a cada geração."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "ia" ? (
              <div>
                {iaUrl ? (
                  <img
                    src={iaUrl}
                    alt={`Imagem gerada por IA para: ${prompt}`}
                    className={`h-auto w-full rounded-xl border border-border transition-[filter] duration-500 ${iaFinal ? "blur-0" : "blur-2xl"}`}
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                    {iaLoading
                      ? "Gerando — o primeiro frame pode levar dezenas de segundos…"
                      : "Nada ainda — gere a primeira."}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={generateIA} disabled={iaLoading || !prompt.trim()}>
                    {iaLoading ? "Gerando…" : "Gerar com IA"}
                  </Button>
                  {iaLoading && (
                    <Button variant="destructive" onClick={() => abortRef.current?.abort()}>
                      Stop
                    </Button>
                  )}
                  <Button variant="outline" onClick={downloadIA} disabled={!iaUrl || !iaFinal}>
                    Baixar PNG
                  </Button>
                </div>
                {iaError && (
                  <p
                    role="alert"
                    className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
                  >
                    {iaError}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <canvas
                  ref={canvasRef}
                  width={1024}
                  height={640}
                  className="h-auto w-full rounded-xl border border-border"
                  role="img"
                  aria-label={`Arte local para o prompt ${prompt}`}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={generateLocal}>Gerar arte</Button>
                  <Button variant="outline" onClick={downloadLocal}>
                    Baixar PNG
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Prompt</CardTitle>
            <CardDescription>Seed local atual: {seed}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ia-model">Modelo de IA (8 disponíveis no gateway)</Label>
              <select
                id="ia-model"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  try {
                    localStorage.setItem("studio:image-model", e.target.value);
                  } catch {
                    // segue sem persistir
                  }
                }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {IMAGE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} · {m.note}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Descreva a imagem</Label>
              <Input
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="ex: lime poster on graphite, minimal"
                maxLength={300}
              />
            </div>
            <div aria-live="polite">
              <p className="text-xs text-muted-foreground">Histórico ({history.length})</p>
              <ul className="mt-2 space-y-2">
                {history.map((h) => (
                  <li
                    key={`${h.kind}-${h.seed}-${h.at}`}
                    className="rounded-lg border border-border p-2 text-xs"
                  >
                    <button
                      type="button"
                      className="w-full text-left hover:underline"
                      onClick={() => {
                        setPrompt(h.prompt);
                        setSeed(h.seed);
                        if (h.kind === "local") setMode("local");
                      }}
                    >
                      [{h.kind}] {h.prompt} · seed {h.seed}
                    </button>
                  </li>
                ))}
                {history.length === 0 && (
                  <li className="text-xs text-muted-foreground">Nada ainda — gere a primeira.</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  );
}
