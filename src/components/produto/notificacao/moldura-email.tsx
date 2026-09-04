import * as React from "react";
import { Paperclip, Reply, Star } from "lucide-react";

import type { Notificacao } from "@/lib/data/notificacoes";
import { dataCurta } from "@/lib/demo/formata";

import { AcoesContraparte } from "./acoes-contraparte";
import { ConteudoNotificacao } from "./conteudo";

/**
 * A moldura de email: fiel ao canal, mas assumidamente simulacao. O conteudo
 * e o mesmo do WhatsApp; so a roupa muda.
 */
export function MolduraEmail({ notificacao }: { notificacao: Notificacao }) {
  const n = notificacao;
  return (
    <div className="overflow-hidden rounded-xl border border-linha bg-papel shadow-flutuante">
      <div className="flex items-center justify-between gap-4 border-b border-linha bg-papel-fundo px-5 py-3">
        <p className="min-w-0 truncate text-corpo font-semibold text-texto">
          {n.assunto}
        </p>
        <span className="flex shrink-0 items-center gap-3 text-texto-tenue">
          <Star className="size-4" aria-hidden />
          <Reply className="size-4" aria-hidden />
        </span>
      </div>

      <div className="flex flex-col gap-1 border-b border-linha px-5 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-ui text-texto">
            <span className="font-semibold">{n.remetente}</span>{" "}
            <span className="text-texto-tenue">
              &lt;avisos@revelio.app&gt;
            </span>
          </p>
          <time className="font-mono text-rotulo text-texto-tenue tabular-nums">
            {dataCurta(n.hoje)}, 06:00
          </time>
        </div>
        <p className="text-rotulo text-texto-tenue">
          para: {n.contraparte.nome} &lt;{n.contraparte.email}&gt;
        </p>
      </div>

      <div className="flex flex-col gap-6 px-5 py-5">
        <ConteudoNotificacao notificacao={n} />
        <div className="border-t border-linha pt-4">
          <AcoesContraparte notificacao={n} />
        </div>
        <p className="flex items-center gap-1.5 text-rotulo text-texto-tenue">
          <Paperclip className="size-3.5" aria-hidden />
          contrato original em anexo, cláusula citada em cada item
        </p>
      </div>
    </div>
  );
}
