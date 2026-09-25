import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StudioShell } from "@/components/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/studio/publish")({
  component: PublishPage,
});

type Check = { label: string; pass: boolean; hint: string };

function runChecks(): Check[] {
  if (typeof document === "undefined") return [];
  const title = document.title;
  const meta = document.querySelector('meta[name="description"]');
  const h1s = document.querySelectorAll("h1").length;
  const imgsWithoutAlt = Array.from(document.querySelectorAll("img")).filter(
    (img) => !img.hasAttribute("alt"),
  ).length;
  const lang = document.documentElement.getAttribute("lang");
  const manifest = document.querySelector('link[rel="manifest"]');
  const theme = document.querySelector('meta[name="theme-color"]');
  return [
    {
      label: `Title presente ("${title.slice(0, 40)}")`,
      pass: title.trim().length >= 10,
      hint: "Ajuste em __root.tsx head.title",
    },
    {
      label: "Meta description presente",
      pass: !!meta && (meta.getAttribute("content") || "").length >= 20,
      hint: "Exigida para SEO on-page",
    },
    {
      label: `Um único h1 (achados: ${h1s})`,
      pass: h1s === 1,
      hint: "Hierarquia h1 → h2 sem pular",
    },
    {
      label: `Imagens com alt (faltando: ${imgsWithoutAlt})`,
      pass: imgsWithoutAlt === 0,
      hint: "Crítico a11y: toda img precisa de alt",
    },
    { label: `lang="${lang}" no html`, pass: !!lang, hint: "Leitores de tela dependem disso" },
    { label: "Manifest PWA linkado", pass: !!manifest, hint: "public/manifest.webmanifest" },
    { label: "theme-color Noite #0a0a0b", pass: !!theme, hint: "Cor da barra em mobile/PWA" },
  ];
}

function PublishPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const passed = checks.filter((c) => c.pass).length;

  useEffect(() => {
    setChecks(runChecks());
  }, []);

  return (
    <StudioShell>
      <Badge variant="secondary">Publish · auditoria viva do DOM</Badge>
      <h1 className="font-display mt-3 text-3xl font-bold">Pronto para publicar?</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground" aria-live="polite">
        {checks.length === 0
          ? "Carregando auditoria…"
          : `${passed}/${checks.length} checks verdes nesta página real — rode em cada módulo.`}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Checklist SEO + a11y + PWA</CardTitle>
            <CardDescription>Inspeciona o documento vivo, não o código.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {checks.map((c) => (
                <li
                  key={c.label}
                  className={`rounded-lg border p-3 text-sm ${c.pass ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5"}`}
                >
                  <p>
                    <span aria-hidden="true">{c.pass ? "✓ " : "✗ "}</span>
                    {c.label}
                  </p>
                  {!c.pass && (
                    <p className="mt-1 text-xs text-muted-foreground">Como corrigir: {c.hint}</p>
                  )}
                </li>
              ))}
            </ul>
            <Button className="mt-4" onClick={() => setChecks(runChecks())}>
              Rodar auditoria de novo
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-display">PWA manifest-only</CardTitle>
            <CardDescription>Home-screen sem quebrar preview (skill pwa).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Manifest em <code>/manifest.webmanifest</code> com nome, cores Noite+Lima e display
              standalone. Sem service worker em dev — offline só no app publicado.
            </p>
            <p className="text-xs text-muted-foreground">
              Sem workbox, sem loops de reload, sem registro em iframe/preview.
            </p>
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  );
}
