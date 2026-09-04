"use client";

import { useParams } from "next/navigation";
import * as React from "react";

import { ContainerPagina } from "@/components/blocos-pagina";
import { MarcaRevelio } from "@/components/produto/marca-revelio";
import { AcoesContraparte } from "@/components/produto/notificacao/acoes-contraparte";
import { ConteudoNotificacao } from "@/components/produto/notificacao/conteudo";
import { Provedores } from "@/components/produto/provedores";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificacaoPorToken } from "@/lib/data/hooks";

/**
 * A pagina que a contraparte abre pelo link da notificacao. Mesmo conteudo e
 * mesmas tres acoes, e nada do painel interno.
 */

function PaginaPublica() {
  const { token } = useParams<{ token: string }>();
  const { data, isPending } = useNotificacaoPorToken(token);

  return (
    <div className="min-h-dvh bg-mesa">
      <header className="border-b border-linha bg-papel">
        <ContainerPagina
          medida="estreita"
          className="flex items-center py-4"
        >
          <MarcaRevelio altura="h-6" />
        </ContainerPagina>
      </header>

      <ContainerPagina medida="estreita" className="flex flex-col gap-6 py-8">
        {isPending ? (
          <Skeleton className="h-96 rounded-lg" />
        ) : !data ? (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-papel px-6 py-16 text-center shadow-papel">
            <p className="text-h3 font-semibold text-texto">
              Link inválido ou expirado
            </p>
            <p className="text-corpo text-texto-suave">
              Peça um link novo pra quem te enviou a notificação.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg bg-papel p-6 shadow-papel">
              <ConteudoNotificacao notificacao={data} />
            </div>
            <div className="rounded-lg bg-papel p-6 shadow-papel">
              <p className="mb-3 text-rotulo text-texto-tenue uppercase">
                sua resposta
              </p>
              <AcoesContraparte notificacao={data} />
            </div>
            <p className="text-center text-rotulo text-texto-tenue">
              Cada item acima cita a cláusula do contrato de onde saiu. Dúvida?
              Use o botão de falar com alguém.
            </p>
          </>
        )}
      </ContainerPagina>
    </div>
  );
}

export default function Pagina() {
  return (
    <Provedores>
      <PaginaPublica />
    </Provedores>
  );
}
