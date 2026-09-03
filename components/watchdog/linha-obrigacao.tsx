import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Semaforo } from "@/components/watchdog/semaforo";
import { dataCurta, humanizaDatas, reais } from "@/lib/demo/formata";
import type { Linha } from "@/lib/demo/resolve";
import { comFeito, hrefDemo, semFeito, type EstadoDemo } from "@/lib/demo/url";
import { cn } from "@/lib/utils";

/**
 * Uma obrigacao na timeline da demo.
 *
 * A etiqueta de origem e o produto inteiro: dizer que a data NAO esta escrita
 * no contrato e o contraste que planilha nenhuma mostra. Por isso "calculada"
 * ganha a cor de destaque e "escrita no contrato" fica neutra.
 *
 * Com `estado` e `hoje` presentes o card vira tarefa: box de acao e toggle
 * feito/nao feito, tudo por link (a data do cumprimento e o hoje do relogio,
 * nao ha input do usuario).
 */
export function LinhaObrigacao({
  linha,
  recem = false,
  atraso = 0,
  estado,
  hoje,
  className,
}: {
  linha: Linha;
  /** Acabou de ganhar data nesta resposta: entra animada. */
  recem?: boolean;
  /** Posicao na sequencia da animacao. */
  atraso?: number;
  estado?: EstadoDemo;
  hoje?: string;
  className?: string;
}) {
  const cumprida = Boolean(linha.cumpridaEm);
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-linha py-4 last:border-b-0",
        "sm:flex-row sm:items-baseline sm:gap-4",
        recem && "animate-in fade-in slide-in-from-bottom-2 fill-mode-both",
        className,
      )}
      style={recem ? { animationDelay: `${atraso * 90}ms` } : undefined}
    >
      <div className="flex items-baseline gap-3 sm:w-44 sm:shrink-0">
        <Semaforo
          dias={linha.dias}
          cumprida={cumprida}
          inativa={linha.condicaoDesativada}
        />
        {linha.data ? (
          <time className="font-mono text-rotulo whitespace-nowrap text-texto-suave tabular-nums">
            {dataCurta(linha.data)}
          </time>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-corpo",
            cumprida ? "text-texto-suave" : "text-texto",
          )}
        >
          {linha.titulo}
          {recem ? (
            <span className="ml-2 rounded-sm bg-alta px-1.5 py-0.5 font-mono text-rotulo text-sobre-alta">
              nova
            </span>
          ) : null}
          {linha.cumpridaEm ? (
            <span className="ml-2 rounded-sm bg-alta px-1.5 py-0.5 font-mono text-rotulo text-sobre-alta">
              feita em {dataCurta(linha.cumpridaEm)}
            </span>
          ) : null}
          {linha.cumpridaEm && estado ? (
            <Link
              href={hrefDemo(estado, {
                feitos: semFeito(estado.feitos, linha.id),
              })}
              className="ml-2 text-rotulo text-texto-tenue underline underline-offset-2 hover:text-texto-suave"
            >
              desfazer
            </Link>
          ) : null}
        </p>
        {linha.detalhe ? (
          <p className="mt-0.5 text-rotulo text-texto-tenue">{linha.detalhe}</p>
        ) : null}

        {linha.origem ? (
          <p
            className={cn(
              "mt-1 text-rotulo",
              linha.escrita || !linha.origem.startsWith("calculada")
                ? "text-texto-tenue"
                : "text-brasa",
            )}
          >
            {linha.origem}
            {linha.condicao ? `, ${linha.condicao}` : ""}
          </p>
        ) : null}

        {linha.pendencia ? (
          <p className="mt-1 text-rotulo text-texto-suave">
            {linha.pendencia}
            {linha.condicao ? `, ${linha.condicao}` : ""}
          </p>
        ) : null}

        {linha.moraCongelada && linha.cumpridaEm ? (
          <p className="mt-1.5 rounded-md bg-papel-fundo px-2.5 py-1.5 text-rotulo text-texto-suave">
            Paga em {dataCurta(linha.cumpridaEm)} com mora congelada de{" "}
            {reais(linha.moraCongelada.multa + linha.moraCongelada.juros)}
          </p>
        ) : null}

        {linha.condicaoDesativada ? (
          <p className="mt-1 text-rotulo text-texto-tenue">
            Condição desativada: sem parcela em aberto neste contrato
          </p>
        ) : null}

        {linha.divergencia ? (
          <p className="mt-1.5 rounded-md bg-aviso px-2.5 py-1.5 text-rotulo text-sobre-aviso">
            {humanizaDatas(linha.divergencia)}
          </p>
        ) : null}

        {linha.acao && !cumprida && !linha.condicaoDesativada ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-papel-fundo px-3 py-2">
            <p className="text-ui text-texto">{linha.acao}</p>
            {estado && hoje ? (
              <Button
                size="sm"
                variant="outline"
                render={
                  <Link
                    href={hrefDemo(estado, {
                      feitos: comFeito(estado.feitos, linha.id, hoje),
                    })}
                  />
                }
              >
                Marcar como feita
              </Button>
            ) : null}
          </div>
        ) : null}

        <details className="mt-1">
          <summary className="cursor-pointer text-rotulo text-texto-tenue underline decoration-dotted underline-offset-2 hover:text-texto-suave">
            ver no documento ({linha.evidencia.rotulo})
          </summary>
          <blockquote className="mt-2 border-l-2 border-linha-campo pl-3 text-corpo text-texto-suave">
            {'"'}
            {linha.evidencia.citacao}
            {'"'}
          </blockquote>
        </details>
      </div>

      {linha.valor ? (
        <p className="font-mono text-corpo text-texto tabular-nums sm:w-32 sm:text-right">
          {reais(linha.valor)}
        </p>
      ) : null}
    </div>
  );
}
