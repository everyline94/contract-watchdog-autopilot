import Link from "next/link";

import { MarcaRevelio } from "@/components/produto/marca-revelio";
import { ToggleTema } from "@/components/tema";
import { BotaoAcao } from "@/components/botao-acao";
import { Button } from "@/components/ui/button";
import { ContainerPagina } from "@/components/blocos-pagina";
import { dataCurta } from "@/lib/demo/formata";
import { hrefDemo, TITULOS_PASSOS, type EstadoDemo } from "@/lib/demo/url";
import { cn } from "@/lib/utils";

/**
 * A moldura da demo: sidebar com os seis passos no desktop, barra compacta no
 * mobile, e rodape fixo com o avancar sempre a mao.
 */

function ChipRelogio({
  estado,
  hoje,
  relogioAtivo,
  className,
}: {
  estado: EstadoDemo;
  hoje: string;
  relogioAtivo: boolean;
  className?: string;
}) {
  return (
    <Link
      href={hrefDemo(estado, { passo: 5 })}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-3 py-1.5 font-mono text-rotulo tabular-nums transition-colors",
        relogioAtivo
          ? "bg-aviso text-sobre-aviso"
          : "border border-linha text-texto-suave hover:border-linha-campo",
        className,
      )}
      title="O relógio da demo mora no passo 5"
    >
      {relogioAtivo ? "relógio da demo: " : "hoje: "}
      {dataCurta(hoje)}
    </Link>
  );
}

function ItemPasso({
  estado,
  n,
  titulo,
}: {
  estado: EstadoDemo;
  n: number;
  titulo: string;
}) {
  const atual = n === estado.passo;
  return (
    <Link
      href={hrefDemo(estado, { passo: n })}
      aria-current={atual ? "step" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        atual
          ? "bg-tinta text-sobre-tinta"
          : "text-texto-suave hover:bg-papel-fundo hover:text-texto",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-rotulo tabular-nums",
          atual
            ? "bg-sobre-tinta/16 text-sobre-tinta"
            : n < estado.passo
              ? "bg-papel-fundo text-texto-suave"
              : "border border-linha text-texto-tenue",
        )}
      >
        {n}
      </span>
      <span className="text-ui font-medium">{titulo}</span>
    </Link>
  );
}

/** A sidebar do desktop: marca, os seis passos, relogio e tema. */
export function SidebarDemo({
  estado,
  hoje,
  relogioAtivo,
}: {
  estado: EstadoDemo;
  hoje: string;
  relogioAtivo: boolean;
}) {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-8 overflow-y-auto border-r border-linha bg-papel px-4 py-6 lg:flex">
      <Link href="/" className="block px-3 pt-1">
        <MarcaRevelio fluida />
        <span className="sr-only">Revelio, início</span>
      </Link>

      <nav aria-label="Passos da demo" className="flex flex-col gap-1">
        {TITULOS_PASSOS.map((titulo, i) => (
          <ItemPasso key={titulo} estado={estado} n={i + 1} titulo={titulo} />
        ))}
      </nav>

      <div className="border-t border-linha pt-4">
        <Link
          href="/app"
          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-ui font-medium text-brasa transition-colors hover:bg-papel-fundo"
        >
          Ler um contrato ao vivo
          <span className="rounded-full bg-pigmento px-2 py-0.5 text-rotulo uppercase text-sobre-pigmento">
            produto
          </span>
        </Link>
      </div>

      <div className="mt-auto flex flex-col gap-3 px-3">
        <ChipRelogio estado={estado} hoje={hoje} relogioAtivo={relogioAtivo} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-rotulo text-texto-tenue uppercase">tema</span>
          <ToggleTema />
        </div>
      </div>
    </aside>
  );
}

/** A barra do mobile, onde a sidebar nao cabe. */
export function TopoDemo({
  estado,
  hoje,
  relogioAtivo,
}: {
  estado: EstadoDemo;
  hoje: string;
  relogioAtivo: boolean;
}) {
  return (
    <header className="border-b border-linha bg-papel lg:hidden">
      <ContainerPagina className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
        <span className="inline-flex items-center">
          <MarcaRevelio altura="h-6" />
        </span>
        <div className="flex items-center gap-2.5">
          <ChipRelogio estado={estado} hoje={hoje} relogioAtivo={relogioAtivo} />
          <ToggleTema />
        </div>
      </ContainerPagina>

      <ContainerPagina className="flex items-center gap-3 pb-4">
        <nav aria-label="Passos da demo" className="flex items-center gap-1.5">
          {TITULOS_PASSOS.map((titulo, i) => {
            const n = i + 1;
            const atual = n === estado.passo;
            return (
              <Link
                key={titulo}
                href={hrefDemo(estado, { passo: n })}
                aria-current={atual ? "step" : undefined}
                aria-label={`Passo ${n}: ${titulo}`}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full font-mono text-rotulo tabular-nums transition-colors",
                  atual
                    ? "bg-tinta text-sobre-tinta"
                    : n < estado.passo
                      ? "bg-papel-fundo text-texto-suave hover:text-texto"
                      : "text-texto-tenue hover:bg-papel-fundo",
                )}
              >
                {n}
              </Link>
            );
          })}
        </nav>
        <p className="text-ui text-texto-suave">
          {TITULOS_PASSOS[estado.passo - 1]}
        </p>
        <span className="ml-auto flex items-center gap-4">
          <Link
            href="/app"
            className="text-ui font-medium text-brasa underline decoration-brasa/40 underline-offset-2 hover:decoration-brasa"
          >
            produto
          </Link>
        </span>
      </ContainerPagina>
    </header>
  );
}

export function RodapeDemo({ estado }: { estado: EstadoDemo }) {
  const ultimo = estado.passo === TITULOS_PASSOS.length;
  return (
    <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-linha bg-mesa/90 backdrop-blur-md lg:left-[272px]">
      <ContainerPagina className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          {estado.passo > 1 ? (
            <Button
              variant="ghost"
              render={
                <Link href={hrefDemo(estado, { passo: estado.passo - 1 })} />
              }
            >
              Voltar
            </Button>
          ) : null}
        </div>
        <p className="hidden font-mono text-rotulo text-texto-tenue tabular-nums sm:block">
          passo {estado.passo} de {TITULOS_PASSOS.length}
        </p>
        {ultimo ? (
          <BotaoAcao render={<Link href="/" />}>Recomeçar a demo</BotaoAcao>
        ) : (
          <BotaoAcao
            seta
            render={
              <Link href={hrefDemo(estado, { passo: estado.passo + 1 })} />
            }
          >
            {TITULOS_PASSOS[estado.passo]}
          </BotaoAcao>
        )}
      </ContainerPagina>
    </footer>
  );
}
