"use client";

import * as React from "react";

import {
  CabecalhoPagina,
  ContainerPagina,
} from "@/components/blocos-pagina";
import { MolduraWhatsapp } from "@/components/produto/notificacao/moldura-whatsapp";
import { Skeleton } from "@/components/ui/skeleton";
import { useContratos, useNotificacao } from "@/lib/data/hooks";
import { cn } from "@/lib/utils";

/**
 * A simulacao do cliente recebendo a cobranca no WhatsApp, pronta pra
 * mostrar em demo: mesma moldura e mesmo conteudo real das notificacoes,
 * com um seletor de contrato pra trocar o cenario na hora.
 */

const PRIORIDADE = ["atrasado", "em_risco", "pendente", "incerteza", "fechado"];

function Simulacao({ contratoId }: { contratoId: string }) {
  const { data, isPending } = useNotificacao(contratoId);
  if (isPending) return <Skeleton className="mx-auto h-[560px] w-full max-w-md rounded-xl" />;
  if (!data) return null;
  return <MolduraWhatsapp notificacao={data} />;
}

export default function PaginaWhatsapp() {
  const { data: contratos, isPending } = useContratos();
  const [escolhido, setEscolhido] = React.useState<string | null>(null);

  const ordenados = React.useMemo(
    () =>
      [...(contratos ?? [])].sort(
        (a, b) => PRIORIDADE.indexOf(a.status) - PRIORIDADE.indexOf(b.status),
      ),
    [contratos],
  );
  const atual = escolhido ?? ordenados[0]?.id ?? null;

  return (
    <ContainerPagina medida="media" className="flex flex-col gap-8 py-8">
      <CabecalhoPagina
        sobretitulo="simulação"
        titulo="A contraparte recebendo no WhatsApp"
        descricao="Exatamente o que a contraparte vê no celular quando o monitor cobra: prazos, valores, multas e as três respostas. Simulação de UI, sem envio real."
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-rotulo text-texto-tenue uppercase">contrato</span>
        {ordenados.map((c) => (
          <button
            key={c.id}
            onClick={() => setEscolhido(c.id)}
            aria-pressed={atual === c.id}
            className={cn(
              "rounded-full px-3 py-1.5 text-ui font-medium transition-colors",
              atual === c.id
                ? "bg-tinta text-sobre-tinta"
                : "border border-linha text-texto-suave hover:border-linha-campo hover:text-texto",
            )}
          >
            {c.titulo}
          </button>
        ))}
      </div>

      {isPending || !atual ? (
        <Skeleton className="mx-auto h-[560px] w-full max-w-md rounded-xl" />
      ) : (
        <Simulacao contratoId={atual} />
      )}
    </ContainerPagina>
  );
}
