import * as React from "react";
import {
  Bot,
  FileUp,
  MessageSquareReply,
  Send,
  UserRoundCheck,
} from "lucide-react";

import type { EventoTimeline } from "@/lib/data/tipos";
import { cn } from "@/lib/utils";

/**
 * A historia do contrato em ordem cronologica inversa: upload, extracao,
 * revisoes humanas, notificacoes e respostas da contraparte.
 */

const ICONES: Record<
  EventoTimeline["tipo"],
  React.ComponentType<{ className?: string }>
> = {
  upload: FileUp,
  extracao: Bot,
  revisao_humana: UserRoundCheck,
  notificacao_enviada: Send,
  resposta_contraparte: MessageSquareReply,
};

const fmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function TimelineEventos({ eventos }: { eventos: EventoTimeline[] }) {
  if (eventos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-linha-campo bg-papel px-5 py-8 text-center text-ui text-texto-suave">
        Nada aconteceu neste contrato ainda.
      </p>
    );
  }

  return (
    <ol className="flex flex-col">
      {eventos.map((e, i) => {
        const Icone = ICONES[e.tipo];
        const destaque = e.tipo === "resposta_contraparte";
        return (
          <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < eventos.length - 1 ? (
              <span
                aria-hidden
                className="absolute top-7 left-[13px] h-[calc(100%-1.75rem)] w-px bg-linha"
              />
            ) : null}
            <span
              className={cn(
                "z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                destaque
                  ? "bg-brasa/12 text-brasa"
                  : "bg-papel-fundo text-texto-suave",
              )}
            >
              <Icone className="size-3.5" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
              <time className="font-mono text-rotulo text-texto-tenue tabular-nums">
                {fmt.format(new Date(e.quando))}
              </time>
              <p className="text-ui text-texto">{e.descricao}</p>
              <span className="text-rotulo text-texto-tenue">
                por: {e.autor}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
