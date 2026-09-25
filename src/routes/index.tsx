import { Link, createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Index,
});

const modules = [
  {
    to: "/studio/image",
    tag: "Imagem",
    title: "Arte generativa local real",
    desc: "Prompt vira arte determinística em canvas com download PNG e histórico. Sem crédito, sem mock.",
  },
  {
    to: "/studio/video",
    tag: "Vídeo",
    title: "Vídeo IA via Veo",
    desc: "Prompt vira MP4 real no gateway + storyboard com narração e JSON exportável.",
  },
  {
    to: "/studio/docs",
    tag: "Docs",
    title: "Brief, budget e deck",
    desc: "Gere MD, CSV de orçamento, deck HTML imprimível e JSON do projeto. Tudo baixa de verdade.",
  },
  {
    to: "/studio/brand",
    tag: "Brand",
    title: "6 ângulos de mensagem",
    desc: "Produto + público + benefício viram ângulos copiáveis e exportáveis em Markdown.",
  },
  {
    to: "/studio/publish",
    tag: "Publish",
    title: "SEO + a11y + PWA live",
    desc: "Checklist real que audita o DOM: title, meta, h1, alt, lang, manifest e theme-color.",
  },
  {
    to: "/studio",
    tag: "Server",
    title: "Dashboard com ServerFn",
    desc: "Loader chama createServerFn de verdade e cruza com contadores locais do seu uso.",
  },
];

function Index() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <p className="font-display text-sm font-bold tracking-tight">
          STUDIO<span className="text-primary">·OS</span>
        </p>
        <nav aria-label="Principal" className="flex items-center gap-2">
          <Link to="/studio" className="text-sm text-muted-foreground hover:text-foreground">
            Abrir studio
          </Link>
          <Button asChild>
            <Link to="/studio/image">Criar agora</Link>
          </Button>
        </nav>
      </header>

      <main id="conteudo" className="mx-auto w-full max-w-6xl px-4 pb-20">
        <section className="mx-auto max-w-3xl pt-14 text-center">
          <Badge variant="secondary">Noite + Lima · Grotesk + Serif · Hero + Bento</Badge>
          <h1 className="font-display mt-6 text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
            Um workspace.
            <br />
            <span className="font-serif-accent font-normal text-primary">tudo cria</span> de
            verdade.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            Imagem generativa, teaser de vídeo, documentos, ângulos de marca e checklist de publish.
            Cada botão funciona, cada arquivo baixa, cada check audita o DOM real.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/studio">Abrir o studio</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/studio/publish">Rodar audit agora</Link>
            </Button>
          </div>
          <dl className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-4 text-center">
            {[
              ["6", "módulos reais"],
              ["0", "mocks de botão"],
              ["100%", "downloads locais"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl border border-border bg-card px-4 py-3">
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-2xl font-bold text-primary">{v}</dd>
                <dd className="text-xs text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label="Módulos" className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Card key={m.to + m.title} className="flex flex-col">
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  {m.tag}
                </Badge>
                <CardTitle className="font-display mt-3 text-xl">{m.title}</CardTitle>
                <CardDescription>{m.desc}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-2">
                <Button variant="secondary" asChild className="w-full">
                  <Link to={m.to}>Abrir módulo</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-16 rounded-2xl border border-border bg-card p-8 md:p-10">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            Denso por padrão.{" "}
            <span className="font-serif-accent font-normal text-primary">Pro por dentro.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            A direção escolhida foi Densidade Pro: hero compacto, bento com previews funcionais e
            dashboard com sidebar. Server Functions via TanStack, estado em localStorage, arquivos
            via Blob e auditoria direto no documento vivo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/studio/docs">Gerar documentos</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/studio/brand">Criar ângulos</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
