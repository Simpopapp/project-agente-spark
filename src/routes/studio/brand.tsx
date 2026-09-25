import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StudioShell } from "@/components/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/studio/brand")({
  component: BrandPage,
});

function buildAngles(product: string, audience: string, benefit: string): string[] {
  const p = product.trim() || "Studio OS";
  const a = audience.trim() || "criadores independentes";
  const b = benefit.trim() || "tirar ideia do papel em uma tarde";
  return [
    `Para ${a}: ${p} é o atalho para ${b} — sem trocar de ferramenta.`,
    `Prova, não promessa: gere imagem, teaser, docs e checklist hoje com ${p}.`,
    `Contraste: planilhas e slides soltos vs ${p}, onde ${b} num fluxo só.`,
    `Economia de tempo: o que levava uma semana em 5 apps, ${p} resolve para ${a} numa sessão.`,
    `Pertencimento: feito para ${a} que publicam — ${p} fala a sua língua: ${b}.`,
    `Risco invertido: comece pelo publish; se o audit não ficar verde, ${p} mostra o que falta.`,
  ];
}

function BrandPage() {
  const [product, setProduct] = useState("Studio OS");
  const [audience, setAudience] = useState("criadores independentes");
  const [benefit, setBenefit] = useState("tirar ideia do papel em uma tarde");
  const [angles, setAngles] = useState<string[]>([]);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setAngles(buildAngles(product, audience, benefit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function generate() {
    const next = buildAngles(product, audience, benefit);
    setAngles(next);
    try {
      localStorage.setItem(
        "studio:angles",
        JSON.stringify(next.map((text) => ({ text, at: new Date().toISOString() }))),
      );
    } catch {
      // segue sem persistir
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("Copiado!");
    } catch {
      setCopied("Selecione e copie manualmente.");
    }
    window.setTimeout(() => setCopied(""), 1600);
  }

  return (
    <StudioShell>
      <Badge variant="secondary">Brand · 6 ângulos reais</Badge>
      <h1 className="font-display mt-3 text-3xl font-bold">Ângulos de mensagem</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground" aria-live="polite">
        {copied || "Preencha os 3 campos e gere. Cada ângulo copia e exporta de verdade."}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Posicionamento</CardTitle>
            <CardDescription>Base de todos os ângulos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="b-product">Produto</Label>
              <Input id="b-product" value={product} onChange={(e) => setProduct(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-audience">Público</Label>
              <Input
                id="b-audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-benefit">Benefício</Label>
              <Input id="b-benefit" value={benefit} onChange={(e) => setBenefit(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={generate} className="flex-1">
                Gerar 6 ângulos
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const md = `# Ângulos — ${product}\n\nPúblico: ${audience}\nBenefício: ${benefit}\n\n${angles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n`;
                  const blob = new Blob([md], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "angulos.md";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-3">
          {angles.map((t, i) => (
            <Card key={`${i}-${t.slice(0, 12)}`}>
              <CardContent className="flex items-start justify-between gap-3 pt-6">
                <p className="text-sm">
                  <span className="font-display font-bold text-primary">{i + 1}. </span>
                  {t}
                </p>
                <Button size="sm" variant="secondary" onClick={() => copy(t)}>
                  Copiar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </StudioShell>
  );
}
