import * as React from "react";
import { Check, TriangleAlert, X } from "lucide-react";

import type { ItemAnalise, Notificacao } from "@/lib/data/notificacoes";
import { dataCurta, reais } from "@/lib/demo/formata";
import { cn } from "@/lib/utils";

/**
 * O laudo da notificacao, o mesmo nas tres telas (email, WhatsApp e pagina
 * publica), no modelo de referencia: analise tecnica em checklist, riscos
 * identificados e recomendacoes numeradas. Linguagem simples, sem juridiques;
 * tudo derivado das clausulas, nada de texto livre.
 */

const ICONE: Record<
  ItemAnalise["estado"],
  { componente: React.ComponentType<{ className?: string }>; classe: string }
> = {
  ok: { componente: Check, classe: "bg-alta text-sobre-alta" },
  falha: { componente: X, classe: "bg-queda text-sobre-queda" },
  atencao: { componente: TriangleAlert, classe: "bg-aviso text-sobre-aviso" },
};

function LinhaAnalise({ item }: { item: ItemAnalise }) {
  const { componente: Icone, classe } = ICONE[item.estado];
  return (
    <li className="flex items-baseline gap-2.5 py-1.5">
      <span
        className={cn(
          "flex size-4.5 shrink-0 translate-y-0.5 items-center justify-center rounded-sm",
          classe,
        )}
      >
        <Icone className="size-3" aria-hidden />
        <span className="sr-only">
          {item.estado === "ok"
            ? "em ordem"
            : item.estado === "falha"
              ? "problema"
              : "atenção"}
        </span>
      </span>
      <span className="min-w-0 text-corpo text-texto">
        {item.rotulo}:{" "}
        <span
          className={cn(
            "font-mono text-rotulo tabular-nums",
            item.estado === "falha" ? "text-queda" : "text-texto-suave",
          )}
        >
          {item.detalhe}
        </span>
      </span>
    </li>
  );
}

export function ConteudoNotificacao({
  notificacao,
  className,
}: {
  notificacao: Notificacao;
  className?: string;
}) {
  const n = notificacao;
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="text-corpo text-texto">
        Olá, {n.contraparte.nome.split(" ")[0]}. Analisei seu contrato{" "}
        <strong>{n.titulo}</strong>, obrigação por obrigação. O quadro de hoje,{" "}
        {dataCurta(n.hoje)}:
      </p>

      <div>
        <p className="text-rotulo text-texto-tenue uppercase">
          análise técnica
        </p>
        <ul className="mt-1">
          {n.analise.map((item) => (
            <LinhaAnalise key={item.clausulaId} item={item} />
          ))}
        </ul>
        {n.totalPendenteCentavos > 0 ? (
          <p className="mt-1.5 font-mono text-ui font-semibold text-texto tabular-nums">
            Total em aberto: {reais(n.totalPendenteCentavos / 100)}
          </p>
        ) : null}
      </div>

      {n.riscos.length > 0 ? (
        <div>
          <p className="text-rotulo text-texto-tenue uppercase">
            riscos identificados
          </p>
          <ul className="mt-1 flex flex-col gap-1">
            {n.riscos.map((risco, i) => (
              <li key={i} className="flex items-baseline gap-2 text-corpo text-texto">
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 translate-y-[-2px] rounded-full bg-queda"
                />
                {risco}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {n.recomendacoes.length > 0 ? (
        <div>
          <p className="text-rotulo text-texto-tenue uppercase">
            recomendações
          </p>
          <ol className="mt-1 flex flex-col gap-1">
            {n.recomendacoes.map((rec, i) => (
              <li key={i} className="flex items-baseline gap-2.5 text-corpo text-texto">
                <span className="shrink-0 font-mono text-rotulo text-texto-tenue tabular-nums">
                  {i + 1}.
                </span>
                {rec}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="text-corpo text-texto-suave">
          Nenhuma ação urgente. Sigo de olho nos próximos vencimentos.
        </p>
      )}
    </div>
  );
}
