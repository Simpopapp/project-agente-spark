import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { StudioShell } from "@/components/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/studio/docs")({
  component: DocsPage,
});

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DocsPage() {
  const [project, setProject] = useState("Studio OS — lançamento");
  const [budget, setBudget] = useState("Imagem:120\nVídeo:200\nDocs:80\nBrand:150");
  const [notes, setNotes] = useState(
    "Foco em Densidade Pro, paleta Noite+Lima, publish com SEO e a11y verdes.",
  );
  const [status, setStatus] = useState("");

  function briefMd() {
    return `# ${project}\n\n## Objetivo\nLançar o workspace criador com 5 módulos funcionais.\n\n## Notas\n${notes}\n\n## Módulos\n- Imagem generativa local (PNG)\n- Teaser com storyboard JSON\n- Documentos (MD, CSV, HTML, JSON)\n- 6 ângulos de marca\n- Publish com SEO, a11y e PWA\n\nGerado em ${new Date().toLocaleString("pt-BR")} · Studio OS\n`;
  }

  return (
    <StudioShell>
      <Badge variant="secondary">Documentos · downloads reais via Blob</Badge>
      <h1 className="font-display mt-3 text-3xl font-bold">Brief, budget e deck</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground" aria-live="polite">
        {status ||
          "Preencha e baixe: Markdown, CSV (abre no Excel), deck HTML imprimível e JSON do projeto."}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Dados</CardTitle>
            <CardDescription>Usados em todos os exports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="d-project">Projeto</Label>
              <Input id="d-project" value={project} onChange={(e) => setProject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-budget">Orçamento (Item:Valor por linha)</Label>
              <Textarea
                id="d-budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-notes">Notas</Label>
              <Textarea
                id="d-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Brief .md</CardTitle>
              <CardDescription>Word/Notion abrem direto.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => {
                  download("brief.md", briefMd(), "text/markdown");
                  setStatus("brief.md baixado.");
                }}
              >
                Baixar brief.md
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Budget .csv</CardTitle>
              <CardDescription>Compatível com Excel/Sheets.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                  const rows = budget
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .map((l) => {
                      const [item, value] = l.split(":");
                      return `${(item || "").trim()};${(value || "").trim()}`;
                    });
                  const total = budget
                    .split("\n")
                    .map((l) => Number(l.split(":")[1]) || 0)
                    .reduce((a, b) => a + b, 0);
                  download(
                    `budget.csv`,
                    `item;valor\n${rows.join("\n")}\nTOTAL;${total}\n`,
                    "text/csv",
                  );
                  setStatus(`budget.csv baixado · total ${total}.`);
                }}
              >
                Baixar budget.csv
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Deck .html</CardTitle>
              <CardDescription>Abre no browser, imprime em PDF.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${project}</title><style>body{font-family:sans-serif;background:#0a0a0b;color:#f5f4ef;padding:48px}h1{font-size:42px}.accent{color:#c8ff2e}.card{border:1px solid #333;border-radius:12px;padding:20px;margin:16px 0}</style></head><body><h1>${project}</h1><p class="accent">Imagem · Vídeo · Docs · Brand · Publish</p><div class="card"><h2>Notas</h2><p>${notes}</p></div><div class="card"><h2>Orçamento</h2><pre>${budget}</pre></div><p>Imprima com Ctrl/Cmd+P para gerar o PDF.</p></body></html>`;
                  download("deck.html", html, "text/html");
                  setStatus("deck.html baixado — abra e imprima em PDF.");
                }}
              >
                Baixar deck.html
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Projeto .json</CardTitle>
              <CardDescription>Snapshot estruturado.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                  download(
                    "projeto.json",
                    JSON.stringify(
                      { project, budget, notes, at: new Date().toISOString() },
                      null,
                      2,
                    ),
                    "application/json",
                  );
                  setStatus("projeto.json baixado.");
                }}
              >
                Baixar projeto.json
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </StudioShell>
  );
}
