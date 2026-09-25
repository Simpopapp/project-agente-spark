import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StudioShell } from "@/components/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudioMeta } from "@/utils/studio.functions";

export const Route = createFileRoute("/studio/")({
  loader: () => getStudioMeta(),
  component: StudioHome,
});

function readCount(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function StudioHome() {
  const loaderData = Route.useLoaderData();
  const metaVersion = loaderData?.version ?? "1.0.0";
  const metaNow = loaderData?.now ?? new Date().toISOString();
  const metaModules = loaderData?.modules ?? ["image", "video", "docs", "brand", "publish"];
  const [counts, setCounts] = useState({ images: 0, boards: 0, angles: 0 });

  useEffect(() => {
    setCounts({
      images: readCount("studio:images"),
      boards: readCount("studio:storyboards"),
      angles: readCount("studio:angles"),
    });
  }, []);

  return (
    <StudioShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary">Dashboard · ServerFn ativa</Badge>
          <h1 className="font-display mt-3 text-3xl font-bold md:text-4xl">
            Boa noite, <span className="font-serif-accent font-normal text-primary">criador.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Servidor respondeu em {new Date(metaNow).toLocaleString("pt-BR")} · versão {metaVersion}
            . Tudo abaixo reflete seu uso real salvo neste navegador.
          </p>
        </div>
        <Button asChild>
          <Link to="/studio/image">Nova imagem</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { label: "Imagens geradas", value: counts.images, to: "/studio/image" },
          { label: "Storyboards", value: counts.boards, to: "/studio/video" },
          { label: "Ângulos salvos", value: counts.angles, to: "/studio/brand" },
        ].map((c) => (
          <Card key={c.label}>
            <CardHeader>
              <CardDescription>{c.label}</CardDescription>
              <CardTitle className="font-display text-4xl font-bold text-primary">
                {c.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link to={c.to}>Abrir</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Fluxo de hoje</CardTitle>
            <CardDescription>Imagem → vídeo → docs → brand → publish.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>
                Gere a arte em{" "}
                <Link className="underline" to="/studio/image">
                  Imagem
                </Link>
                .
              </li>
              <li>
                Monte o teaser em{" "}
                <Link className="underline" to="/studio/video">
                  Vídeo
                </Link>
                .
              </li>
              <li>
                Exporte brief e budget em{" "}
                <Link className="underline" to="/studio/docs">
                  Documentos
                </Link>
                .
              </li>
              <li>
                Valide tudo em{" "}
                <Link className="underline" to="/studio/publish">
                  Publish
                </Link>
                .
              </li>
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Módulos</CardTitle>
            <CardDescription>{metaModules.join(" · ")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link to="/studio/docs">Documentos</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link to="/studio/brand">Brand</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link to="/studio/publish">Publish</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  );
}
