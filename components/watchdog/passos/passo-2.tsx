import Link from "next/link";
import * as React from "react";

import { Secao } from "@/components/blocos-pagina";
import { PaginaDestacada } from "@/components/watchdog/pagina-destacada";
import { CONTRATO_SHOW } from "@/lib/demo/contratos";
import { dataCurta, reais } from "@/lib/demo/formata";
import { hrefDemo, type EstadoDemo } from "@/lib/demo/url";
import { cn } from "@/lib/utils";

/**
 * Passo 2: o contrato entra como documento e sai como dado, com a clausula
 * de origem visivel. Cada campo selecionado abre a pagina real destacada.
 */

const CAMPOS = [
  "show-evento",
  "show-entrada",
  "show-saldo",
  "show-materiais",
  "show-pixelmap",
] as const;

function valorDoCampo(id: string): { rotulo: string; valor: string } {
  const c = CONTRATO_SHOW;
  const o = c.obrigacoes.find((x) => x.id === id)!;
  switch (id) {
    case "show-evento":
      return {
        rotulo: "Data do evento",
        valor: `${dataCurta(o.escritaNoPapel!)}, ${c.horario}`,
      };
    case "show-entrada":
      return {
        rotulo: "Entrada de 30%",
        valor: `${reais(o.valor!)}, até ${dataCurta(o.escritaNoPapel!)}`,
      };
    case "show-saldo":
      return {
        rotulo: "Saldo de 70%",
        valor: `${reais(o.valor!)}, até ${dataCurta(o.escritaNoPapel!)}, e uma regra: 7 dias antes do evento`,
      };
    case "show-materiais":
      return {
        rotulo: "Materiais da cliente",
        valor: "fotos, vídeos, textos e tema, 30 dias antes do evento",
      };
    default:
      return {
        rotulo: "Pixelmap do painel de LED",
        valor: "devido por um terceiro, 30 dias antes do evento",
      };
  }
}

export function Passo2({ estado }: { estado: EstadoDemo }) {
  const c = CONTRATO_SHOW;
  const selecionado = CAMPOS.includes(estado.campo as (typeof CAMPOS)[number])
    ? (estado.campo as (typeof CAMPOS)[number])
    : CAMPOS[0];
  const obrigacao = c.obrigacoes.find((o) => o.id === selecionado)!;

  return (
    <Secao
      titulo="O contrato entra como documento, sai como dado"
      descricao={`${c.nome}, com ${c.contraparte}: ${c.paginas} páginas, valor de ${reais(c.valores.liquido)} já com o desconto. Cada campo da ficha aponta a cláusula de origem, e o documento abre na página certa. É a evidência que faz alguém parar de conferir na mão.`}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          {CAMPOS.map((id) => {
            const o = c.obrigacoes.find((x) => x.id === id)!;
            const { rotulo, valor } = valorDoCampo(id);
            const ativo = id === selecionado;
            return (
              <Link
                key={id}
                href={hrefDemo(estado, { passo: 2, campo: id })}
                aria-current={ativo ? "true" : undefined}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border px-4 py-3 transition-colors",
                  ativo
                    ? "border-linha-campo bg-papel shadow-papel"
                    : "border-transparent bg-papel/60 hover:bg-papel",
                )}
              >
                <span className="text-rotulo uppercase text-texto-tenue">
                  {rotulo}
                </span>
                <span className="text-corpo text-texto">{valor}</span>
                <span
                  className={cn(
                    "text-rotulo",
                    ativo ? "text-brasa" : "text-texto-tenue",
                  )}
                >
                  {o.evidencia.rotulo}
                </span>
              </Link>
            );
          })}

          <blockquote className="rounded-lg border-l-2 border-linha-campo bg-papel px-4 py-3 text-corpo text-texto-suave shadow-papel">
            “{obrigacao.evidencia.citacao}”
          </blockquote>
        </div>

        <figure className="flex flex-col gap-2">
          <PaginaDestacada
            nome={obrigacao.evidencia.imagem!}
            alt={`Página ${obrigacao.evidencia.pagina} do contrato, com o trecho da cláusula destacado`}
          />
          <figcaption className="flex flex-wrap items-center justify-between gap-2 text-rotulo text-texto-tenue">
            <span>
              página {obrigacao.evidencia.pagina} de {c.paginas}, trecho
              destacado
            </span>
            <a
              href={`${c.pdf}#page=${obrigacao.evidencia.pagina}`}
              target="_blank"
              rel="noreferrer"
              className="text-brasa underline decoration-brasa/40 underline-offset-2 hover:decoration-brasa"
            >
              abrir o contrato inteiro (PDF)
            </a>
          </figcaption>
        </figure>
      </div>
    </Secao>
  );
}
