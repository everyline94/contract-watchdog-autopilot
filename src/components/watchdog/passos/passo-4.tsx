import Link from "next/link";
import * as React from "react";

import { Secao } from "@/components/blocos-pagina";
import { TileMetrica } from "@/components/tile-metrica";
import { LinhaObrigacao } from "@/components/watchdog/linha-obrigacao";
import { PaginaDestacada } from "@/components/watchdog/pagina-destacada";
import { PerguntaEvento } from "@/components/watchdog/pergunta-evento";
import { CONTRATO_ESTUDIO } from "@/lib/demo/contratos";
import { dataCurta } from "@/lib/demo/formata";
import { contagens, type Linha } from "@/lib/demo/resolve";
import { hrefDemo, type EstadoDemo } from "@/lib/demo/url";

/**
 * Passo 4: o que o sistema nao sabe, ele pergunta. E quando alguem responde,
 * as datas que dependiam da resposta entram todas de uma vez.
 *
 * E o momento mais forte da demo: autonomia com incerteza sinalizada.
 */
export function Passo4({
  estado,
  linhasAntes,
  linhas,
}: {
  estado: EstadoDemo;
  /** O contrato como chegou, sem resposta: para contar o que destravou. */
  linhasAntes: Linha[];
  linhas: Linha[];
}) {
  const c = CONTRATO_ESTUDIO;
  const respondido = Boolean(estado.evento);
  const antes = contagens(linhasAntes);
  const agora = contagens(linhas);
  const destravadas = agora.comData - antes.comData;
  const evento = c.obrigacoes.find((o) => o.ehEvento)!;
  const aindaNaFila = linhas.filter((l) => l.motivoPendencia === "pergunta");
  const recem = new Set(
    respondido
      ? linhas
          .filter(
            (l) =>
              l.data !== null &&
              linhasAntes.find((a) => a.id === l.id)?.data === null,
          )
          .map((l) => l.id)
      : [],
  );

  return (
    <>
      <Secao
        titulo="Oito páginas, uma única data escrita"
        descricao={`${c.nome}, com a ${c.contraparte}. A data do evento não consta no documento, e não consta porque a cláusula é circular: a contratante vai informar com 30 dias de antecedência, contados da própria data. ${antes.pendentesDoEvento} obrigações ficam paradas por causa disso. O sistema não trava e não chuta: abre uma pergunta.`}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <TileMetrica
            rotulo="datas escritas no documento"
            valor={String(antes.escritas)}
            nota={`em ${c.paginas} páginas`}
          />
          <TileMetrica
            rotulo="obrigações com data"
            valor={respondido ? `${agora.comData}` : `${antes.comData}`}
            fracao={` de ${agora.total}`}
          />
          <TileMetrica
            rotulo="esperando uma pessoa"
            valor={String(agora.naFila)}
            nota={respondido ? "sobrou a que não tem resposta pronta" : "na fila humana"}
          />
        </div>

        {respondido ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-alta px-5 py-4 text-sobre-alta animate-in fade-in slide-in-from-bottom-2">
            <p className="text-corpo font-medium">
              Uma resposta, {dataCurta(estado.evento!)}, e {destravadas} datas
              entraram no calendário de uma vez. Nenhuma delas está escrita no
              contrato.
            </p>
            <Link
              href={hrefDemo(estado, { evento: null })}
              className="text-ui underline underline-offset-2"
            >
              desfazer a resposta
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-lg bg-papel p-6 shadow-papel">
              <p className="text-rotulo uppercase text-texto-tenue">
                fila humana, pergunta aberta pelo sistema
              </p>
              <blockquote className="border-l-2 border-linha-campo pl-3 text-corpo text-texto-suave">
                “{evento.evidencia.citacao}” ({evento.evidencia.rotulo})
              </blockquote>
              <PerguntaEvento estado={estado} />
            </div>
            <figure className="flex flex-col gap-2">
              <PaginaDestacada
                nome={evento.evidencia.imagem!}
                alt="Página do contrato com a cláusula circular destacada"
              />
              <figcaption className="flex flex-wrap items-center justify-between gap-2 text-rotulo text-texto-tenue">
                <span>página {evento.evidencia.pagina} de {c.paginas}</span>
                <a
                  href={`${c.pdf}#page=${evento.evidencia.pagina}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brasa underline decoration-brasa/40 underline-offset-2 hover:decoration-brasa"
                >
                  abrir o contrato inteiro (PDF)
                </a>
              </figcaption>
            </figure>
          </div>
        )}

        <div className="rounded-lg bg-papel px-5 shadow-papel">
          {linhas.map((l, i) => (
            <LinhaObrigacao
              key={l.id}
              linha={l}
              recem={recem.has(l.id)}
              atraso={i}
            />
          ))}
        </div>

        {respondido && aindaNaFila.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-lg bg-papel p-5 shadow-papel">
            <p className="text-rotulo uppercase text-texto-tenue">
              continua na fila, porque o motivo é outro
            </p>
            {aindaNaFila.map((l) => (
              <p key={l.id} className="text-corpo text-texto">
                {l.titulo}: {l.pendencia ? l.pendencia.charAt(0).toLowerCase() + l.pendencia.slice(1) : ""}. A pergunta certa aqui é outra, e o
                sistema sabe a diferença.
              </p>
            ))}
          </div>
        ) : null}
      </Secao>
    </>
  );
}
