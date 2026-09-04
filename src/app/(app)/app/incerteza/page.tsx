"use client";

import * as React from "react";

import {
  CabecalhoPagina,
  ContainerPagina,
} from "@/components/blocos-pagina";
import { ListaIncerteza } from "@/components/produto/incerteza/lista-incerteza";
import { ROTULOS_MOTIVO } from "@/components/produto/incerteza/motivos";
import { Skeleton } from "@/components/ui/skeleton";
import { useContratos, useIncerteza } from "@/lib/data/hooks";
import type { MotivoIncerteza } from "@/lib/data/tipos";
import { cn } from "@/lib/utils";

const MOTIVOS = Object.keys(ROTULOS_MOTIVO) as MotivoIncerteza[];

function Pilula({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ativa}
      className={cn(
        "rounded-full px-3 py-1.5 text-ui font-medium transition-colors",
        ativa
          ? "bg-tinta text-sobre-tinta"
          : "border border-linha text-texto-suave hover:border-linha-campo hover:text-texto",
      )}
    >
      {children}
    </button>
  );
}

export default function PaginaIncerteza() {
  const [motivo, setMotivo] = React.useState<MotivoIncerteza | undefined>();
  const [contratoId, setContratoId] = React.useState<string | undefined>();

  const { data: itens, isPending, isError, refetch } = useIncerteza({
    motivo,
    contratoId,
  });
  const { data: todosItens } = useIncerteza();
  const { data: contratos } = useContratos();

  // So contratos que tem item aberto entram no filtro.
  const comItem = React.useMemo(() => {
    const ids = new Set((todosItens ?? []).map((i) => i.contratoId));
    return (contratos ?? []).filter((c) => ids.has(c.id));
  }, [todosItens, contratos]);

  return (
    <ContainerPagina className="flex flex-col gap-8 py-8">
      <CabecalhoPagina
        sobretitulo="validação humana"
        titulo="Fila de incerteza"
        descricao="O que a IA não resolveu com confiança suficiente pra decidir sozinha. Cada item resolvido aqui destrava o contrato inteiro."
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-rotulo text-texto-tenue uppercase">motivo</span>
          <Pilula ativa={!motivo} onClick={() => setMotivo(undefined)}>
            todos
          </Pilula>
          {MOTIVOS.map((m) => (
            <Pilula
              key={m}
              ativa={motivo === m}
              onClick={() => setMotivo(motivo === m ? undefined : m)}
            >
              {ROTULOS_MOTIVO[m]}
            </Pilula>
          ))}
        </div>
        {comItem.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-rotulo text-texto-tenue uppercase">
              contrato
            </span>
            <Pilula
              ativa={!contratoId}
              onClick={() => setContratoId(undefined)}
            >
              todos
            </Pilula>
            {comItem.map((c) => (
              <Pilula
                key={c.id}
                ativa={contratoId === c.id}
                onClick={() =>
                  setContratoId(contratoId === c.id ? undefined : c.id)
                }
              >
                {c.titulo}
              </Pilula>
            ))}
          </div>
        ) : null}
      </div>

      {isPending ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-linha-campo bg-papel px-6 py-12 text-center">
          <p className="text-corpo font-medium text-texto">
            Não conseguimos carregar a fila
          </p>
          <button
            onClick={() => refetch()}
            className="text-ui font-medium text-brasa underline decoration-brasa/40 underline-offset-2 hover:decoration-brasa"
          >
            Tentar de novo
          </button>
        </div>
      ) : (
        <ListaIncerteza
          itens={itens ?? []}
          filtrada={Boolean(motivo || contratoId)}
        />
      )}
    </ContainerPagina>
  );
}
