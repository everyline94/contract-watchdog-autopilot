"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { UserRoundSearch } from "lucide-react";

import {
  CabecalhoPagina,
  ContainerPagina,
  Secao,
} from "@/components/blocos-pagina";
import { BotaoAcao } from "@/components/botao-acao";
import {
  AcaoAgenda,
  SeloAgenda,
} from "@/components/produto/contrato/agenda-contrato";
import { GrupoClausulas } from "@/components/produto/contrato/grupo-clausulas";
import { TimelineEventos } from "@/components/produto/contrato/timeline-eventos";
import { SeloConfianca } from "@/components/produto/selo-confianca";
import { SeloStatus } from "@/components/produto/selo-status";
import { Skeleton } from "@/components/ui/skeleton";
import { useContrato } from "@/lib/data/hooks";
import { dataCurta, reais } from "@/lib/demo/formata";

export default function PaginaContrato() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending } = useContrato(id);

  if (isPending) {
    return (
      <ContainerPagina className="flex flex-col gap-8 py-8">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </ContainerPagina>
    );
  }

  if (!data) {
    return (
      <ContainerPagina className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-h3 font-semibold text-texto">
          Contrato não encontrado
        </p>
        <p className="text-corpo text-texto-suave">
          Ele pode ter sido removido, ou o link veio errado.
        </p>
        <Link
          href="/app"
          className="text-ui font-medium text-brasa underline decoration-brasa/40 underline-offset-2 hover:decoration-brasa"
        >
          Voltar pro dashboard
        </Link>
      </ContainerPagina>
    );
  }

  const {
    contrato,
    clausulas,
    incertezas,
    eventos,
    hoje,
    revisadoPor,
    obrigacoesComData,
  } = data;
  const abertas = incertezas.filter((i) => !i.assumidoPor);

  return (
    <ContainerPagina className="flex flex-col gap-8 py-8">
      <CabecalhoPagina
        sobretitulo={
          <span className="inline-flex items-center gap-2">
            contrato <SeloStatus status={contrato.status} />
          </span>
        }
        titulo={contrato.titulo}
        descricao={
          <>
            {contrato.contraparte.nome}, {contrato.contraparte.email},{" "}
            {contrato.contraparte.telefone}
            {contrato.valorCentavos
              ? `, ${reais(contrato.valorCentavos / 100)} no total`
              : ""}
            {contrato.vigenciaFim
              ? `, vigência até ${dataCurta(contrato.vigenciaFim)}`
              : ""}
          </>
        }
        acoes={
          <>
            <AcaoAgenda
              contratoId={contrato.id}
              obrigacoesComData={obrigacoesComData}
            />
            <BotaoAcao
              render={
                <Link href={`/app/contratos/${contrato.id}/notificacao`} />
              }
              seta
            >
              Gerar notificação
            </BotaoAcao>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SeloConfianca
          confianca={contrato.confiancaExtracao}
          revisadoPor={revisadoPor}
        />
        <span className="font-mono text-rotulo text-texto-tenue tabular-nums">
          upload em {dataCurta(contrato.dataUpload.slice(0, 10))}
        </span>
        <span className="font-mono text-rotulo text-texto-tenue">
          {contrato.arquivoUrl.split("/").pop()}
        </span>
        <SeloAgenda contratoId={contrato.id} />
      </div>

      {abertas.length > 0 ? (
        <Link
          href="/app/incerteza"
          className="flex items-center gap-3 rounded-lg border border-brasa/40 bg-brasa/4 px-4 py-3 transition-colors hover:bg-brasa/8"
        >
          <UserRoundSearch className="size-4 shrink-0 text-brasa" aria-hidden />
          <span className="text-ui text-texto">
            <span className="font-medium text-brasa">
              {abertas.length}{" "}
              {abertas.length === 1 ? "item aberto" : "itens abertos"} na fila
              de incerteza.
            </span>{" "}
            Este contrato não é confiável até um humano revisar.
          </span>
        </Link>
      ) : null}

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
        <Secao
          titulo="Cláusulas e obrigações"
          descricao="Agrupadas por tipo, cada uma com origem e confiança."
        >
          <GrupoClausulas clausulas={clausulas} hoje={hoje} />
        </Secao>

        <Secao titulo="Timeline" className="lg:sticky lg:top-8">
          <div className="rounded-lg bg-papel p-5 shadow-papel">
            <TimelineEventos eventos={eventos} />
          </div>
        </Secao>
      </div>
    </ContainerPagina>
  );
}
