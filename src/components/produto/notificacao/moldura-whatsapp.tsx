import * as React from "react";
import { CheckCheck, Phone, Video } from "lucide-react";

import type { Notificacao } from "@/lib/data/notificacoes";

import { AcoesContraparte } from "./acoes-contraparte";
import { ConteudoNotificacao } from "./conteudo";

/**
 * A moldura de WhatsApp: cabecalho de conversa, balao de mensagem e as tres
 * acoes como resposta rapida. Simulacao fiel de UI, sem integracao.
 */
export function MolduraWhatsapp({ notificacao }: { notificacao: Notificacao }) {
  const n = notificacao;
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-linha shadow-flutuante">
      <div className="flex items-center gap-3 bg-tinta px-4 py-3 text-sobre-tinta">
        {/* A tinta inverte entre os temas, entao o par de wordmarks tambem:
            claro sobre o header preto, escuro sobre o header claro. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marca/revelio-branco.svg"
          alt={n.remetente}
          className="h-5 w-auto dark:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marca/revelio-preto.svg"
          alt={n.remetente}
          className="hidden h-5 w-auto dark:inline"
        />
        <div className="min-w-0 flex-1">
          <p className="text-rotulo opacity-70">online agora</p>
        </div>
        <Video className="size-4 opacity-70" aria-hidden />
        <Phone className="size-4 opacity-70" aria-hidden />
      </div>

      <div className="flex flex-col gap-3 bg-papel-fundo px-3 py-4">
        <p className="mx-auto rounded-md bg-papel px-2.5 py-1 font-mono text-rotulo text-texto-tenue">
          hoje, 06:00
        </p>

        <div className="max-w-[92%] rounded-xl rounded-tl-sm bg-papel p-3.5 shadow-papel">
          <ConteudoNotificacao notificacao={n} />
          <p className="mt-2 flex items-center justify-end gap-1 font-mono text-rotulo text-texto-tenue tabular-nums">
            06:00 <CheckCheck className="size-3.5 text-mare" aria-hidden />
          </p>
        </div>

        <div className="max-w-[92%] rounded-xl rounded-tl-sm bg-papel p-3.5 shadow-papel">
          <AcoesContraparte notificacao={n} />
        </div>
      </div>
    </div>
  );
}
