"use client";

import * as React from "react";

import { Secao } from "@/components/blocos-pagina";
import { SeloConfianca } from "@/components/produto/selo-confianca";
import { Skeleton } from "@/components/ui/skeleton";
import { useConcluiRevisao, useResultadoExtracao } from "@/lib/data/hooks";
import { dataCurta, reais } from "@/lib/demo/formata";
import { toast } from "sonner";

import { FormContraparte } from "./form-contraparte";

const ROTULO_TIPO: Record<string, string> = {
  prazo: "prazo",
  valor: "valor",
  reajuste: "reajuste",
  multa: "multa",
  renovacao: "renovação",
  obrigacao: "obrigação",
};

/**
 * O resultado da extracao na etapa de revisao: toda clausula com a confianca
 * individual, as abaixo do limiar ja marcadas como enviadas pra fila, e o
 * formulario da contraparte que conclui o item.
 */
export function PainelResultado({ itemId }: { itemId: string }) {
  const { data, isPending } = useResultadoExtracao(itemId);
  const concluir = useConcluiRevisao();

  if (isPending) {
    return <Skeleton className="h-72 rounded-lg" />;
  }
  if (!data) {
    return (
      <p className="rounded-lg border border-dashed border-linha-campo bg-papel px-6 py-8 text-center text-ui text-texto-suave">
        Este item não está mais na etapa de revisão.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8 rounded-lg bg-papel p-6 shadow-papel">
      <Secao
        titulo={`O que a leitura encontrou em ${data.nomeArquivo}`}
        descricao="Cada campo com a confiança individual. O que ficou abaixo do limiar vai pra fila de incerteza quando você concluir e não trava a conclusão."
      >
        <ul>
          {data.clausulas.map((c, i) => (
            <li
              key={i}
              className="flex flex-col gap-2 border-b border-linha py-3.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="font-mono text-rotulo text-texto-tenue uppercase sm:w-24 sm:shrink-0">
                {ROTULO_TIPO[c.tipo]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-corpo text-texto">
                  {c.resumoSimplificado}
                  {c.naFila ? (
                    <span className="ml-2 rounded-sm bg-brasa/12 px-1.5 py-0.5 font-mono text-rotulo text-brasa">
                      vai pra fila de incerteza
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {c.dataLimite ? (
                    <time className="font-mono text-rotulo text-texto-suave tabular-nums">
                      {dataCurta(c.dataLimite)}
                    </time>
                  ) : null}
                  {c.valorCentavos ? (
                    <span className="font-mono text-rotulo text-texto-suave tabular-nums">
                      {reais(c.valorCentavos / 100)}
                    </span>
                  ) : null}
                  <SeloConfianca
                    confianca={c.confianca}
                    revisadoPor={c.revisadoPor}
                  />
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao
        titulo="Quem é a contraparte"
        descricao="Obrigatório pra concluir: é por aqui que ela vai ser notificada de prazo, valor e multa."
      >
        <FormContraparte
          tituloSugerido={data.tituloSugerido}
          enviando={concluir.isPending}
          aoConcluir={(dados) =>
            concluir.mutate(
              { itemId, ...dados },
              {
                // O sucesso e observado pela pagina, que ve o item concluir na
                // fila; aqui so o erro, que mantem o painel montado.
                onSuccess: (r) => {
                  if (!r.ok) toast.error(r.erro);
                },
              },
            )
          }
        />
      </Secao>
    </div>
  );
}
