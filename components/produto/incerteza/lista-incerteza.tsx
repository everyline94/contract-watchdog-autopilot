"use client";

import Link from "next/link";
import * as React from "react";
import { Bot } from "lucide-react";

import { BotaoAcao } from "@/components/botao-acao";
import { SeloConfianca } from "@/components/produto/selo-confianca";
import type { ItemIncertezaDetalhado } from "@/lib/data/incerteza";
import { cn } from "@/lib/utils";

import { EditorAssumir } from "./editor-assumir";
import { ROTULOS_MOTIVO } from "./motivos";

/** Um item da fila: o que a IA viu, o que ela sugere, e o botao de assumir. */
function CartaoIncerteza({
  item,
  aoAssumir,
}: {
  item: ItemIncertezaDetalhado;
  aoAssumir: () => void;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-brasa/25 bg-papel p-5 shadow-papel">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/app/contratos/${item.contratoId}`}
            className="truncate text-corpo font-medium text-texto underline decoration-dotted underline-offset-2 hover:text-texto-suave"
          >
            {item.contratoTitulo}
          </Link>
          <span className="text-rotulo text-brasa">
            {ROTULOS_MOTIVO[item.motivo]}
          </span>
        </div>
        <SeloConfianca confianca={item.confianca} revisadoPor="ia" />
      </header>

      <blockquote className="rounded-md border-l-2 border-linha-campo bg-papel-fundo px-3 py-2 font-mono text-ui text-texto-suave">
        {item.trechoBruto}
      </blockquote>

      {item.paginaPreviewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.paginaPreviewUrl}
          alt="Página do PDF como ela chegou"
          className="max-h-44 w-full rounded-md border border-linha object-cover object-top"
        />
      ) : null}

      <p className="flex items-start gap-2 text-corpo text-texto">
        <Bot className="mt-1 size-4 shrink-0 text-texto-tenue" aria-hidden />
        {item.interpretacaoSugerida}
      </p>

      <div className="flex justify-end">
        <BotaoAcao onClick={aoAssumir}>Assumir no lugar da IA</BotaoAcao>
      </div>
    </article>
  );
}

export function ListaIncerteza({
  itens,
  filtrada,
  className,
}: {
  itens: ItemIncertezaDetalhado[];
  /** true quando ha filtro ativo: muda o texto do vazio. */
  filtrada: boolean;
  className?: string;
}) {
  const [aberto, setAberto] = React.useState<ItemIncertezaDetalhado | null>(
    null,
  );

  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-linha-campo bg-papel px-6 py-12 text-center">
        <p className="text-corpo font-medium text-texto">
          {filtrada ? "Nada com esse filtro" : "Fila vazia"}
        </p>
        <p className="text-ui text-texto-suave">
          {filtrada
            ? "Nenhum item aberto bate com o filtro escolhido."
            : "A IA está dando conta: nenhum campo esperando revisão humana."}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-5 lg:grid-cols-2", className)}>
      {itens.map((item) => (
        <CartaoIncerteza
          key={item.id}
          item={item}
          aoAssumir={() => setAberto(item)}
        />
      ))}
      <EditorAssumir item={aberto} aoFechar={() => setAberto(null)} />
    </div>
  );
}
