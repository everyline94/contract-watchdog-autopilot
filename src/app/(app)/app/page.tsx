"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";

import {
  CabecalhoPagina,
  ContainerPagina,
  Secao,
} from "@/components/blocos-pagina";
import { BotaoAcao } from "@/components/botao-acao";
import { CartaoResumo } from "@/components/produto/cartao-resumo";
import { ProximasObrigacoes } from "@/components/produto/proximas-obrigacoes";
import { ROTULOS_STATUS } from "@/components/produto/selo-status";
import { TabelaContratos } from "@/components/produto/tabela-contratos";
import { Skeleton } from "@/components/ui/skeleton";
import { useResumoDashboard } from "@/lib/data/hooks";
import type { StatusContrato } from "@/lib/data/tipos";
import { dataLonga, reais } from "@/lib/demo/formata";
import Link from "next/link";

const FILTROS: StatusContrato[] = [
  "fechado",
  "pendente",
  "atrasado",
  "em_risco",
];

/** ROTULOS_STATUS e singular (selo); titulo de secao concorda no plural. */
const PLURAIS_STATUS: Record<StatusContrato, string> = {
  fechado: "fechados",
  pendente: "pendentes",
  atrasado: "atrasados",
  em_risco: "em risco",
  incerteza: "em incerteza",
};

function Carregando() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}

function Dashboard() {
  const params = useSearchParams();
  const bruto = params.get("status");
  const filtro =
    bruto && [...FILTROS, "incerteza"].includes(bruto as StatusContrato)
      ? (bruto as StatusContrato)
      : undefined;

  const { data, isPending, isError, refetch } = useResumoDashboard();

  return (
    <ContainerPagina className="flex flex-col gap-10 py-8">
      <CabecalhoPagina
        sobretitulo="sua carteira"
        titulo="O que os contratos cobram de você"
        descricao={
          data
            ? `${dataLonga(data.hoje)}, ${reais(
                data.valorEmAbertoCentavos / 100,
              )} em aberto na carteira`
            : undefined
        }
        acoes={
          <BotaoAcao render={<Link href="/app/upload" />} seta>
            Subir contratos
          </BotaoAcao>
        }
      />

      {isPending ? <Carregando /> : null}

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-linha-campo bg-papel px-6 py-12 text-center">
          <p className="text-corpo font-medium text-texto">
            Não conseguimos carregar a carteira
          </p>
          <button
            onClick={() => refetch()}
            className="text-ui font-medium text-brasa underline decoration-brasa/40 underline-offset-2 hover:decoration-brasa"
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {FILTROS.map((status) => (
              <CartaoResumo
                key={status}
                rotulo={ROTULOS_STATUS[status]}
                valor={data.porStatus[status]}
                href={filtro === status ? "/app" : `/app?status=${status}`}
                selecionado={filtro === status}
              />
            ))}
            <CartaoResumo
              rotulo="fila de incerteza"
              valor={data.incertezasAbertas}
              href="/app/incerteza"
              destaqueIncerteza
              selecionado={filtro === "incerteza"}
              nota={
                data.incertezasAbertas > 0
                  ? "a IA precisa de você aqui"
                  : "nada esperando revisão"
              }
              linkSecundario={
                filtro === "incerteza"
                  ? { href: "/app", rotulo: "limpar filtro" }
                  : { href: "/app?status=incerteza", rotulo: "ver contratos" }
              }
            />
          </div>

          <Secao
            titulo={
              filtro
                ? `Contratos ${PLURAIS_STATUS[filtro]}`
                : "Contratos recentes"
            }
            descricao={
              filtro === "incerteza"
                ? "Filtrado pelo card acima. O link do card limpa o filtro."
                : filtro
                  ? "Filtrado pelo card acima. Clique de novo no card pra limpar."
                  : "Do upload mais novo pro mais antigo."
            }
          >
            <TabelaContratos
              contratos={
                filtro
                  ? data.recentes.filter((c) => c.status === filtro)
                  : data.recentes
              }
              vazioTitulo={
                filtro === "incerteza"
                  ? "Nenhum contrato em incerteza agora"
                  : filtro
                    ? `Nenhum contrato ${ROTULOS_STATUS[filtro]} agora`
                    : "Nenhum contrato por aqui"
              }
              vazioDetalhe={
                filtro
                  ? "Nenhum contrato da carteira está nesse status."
                  : "Suba um PDF na fila de upload pra começar."
              }
              limparFiltroHref={filtro ? "/app" : undefined}
            />
          </Secao>

          <Secao
            titulo="Próximas obrigações"
            descricao="Tudo que vence somando a carteira inteira, não um contrato por vez."
          >
            <ProximasObrigacoes
              vencidas={data.vencidas}
              proximas7={data.proximas7}
              proximas30={data.proximas30}
            />
          </Secao>
        </>
      ) : null}
    </ContainerPagina>
  );
}

export default function PaginaDashboard() {
  return (
    <React.Suspense fallback={null}>
      <Dashboard />
    </React.Suspense>
  );
}
