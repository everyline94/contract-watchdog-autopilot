import * as React from "react";
import { BadgeCheck, Bot } from "lucide-react";

import { LIMIAR_INCERTEZA } from "@/lib/data/tipos";
import { cn } from "@/lib/utils";

/**
 * A marcacao de origem e confianca. Regra do produto: nenhum campo extraido
 * aparece sem ela. Humano revisou: selo cheio, sem porcentagem (a confianca
 * virou 1 por definicao). IA: porcentagem sempre visivel, e abaixo do limiar
 * ela veste o par do aviso (o amarelo de atencao), nao a brasa: verde e marca
 * e positivo, nao alerta.
 */
export function SeloConfianca({
  confianca,
  revisadoPor,
  className,
}: {
  confianca: number;
  revisadoPor: "ia" | "humano";
  className?: string;
}) {
  if (revisadoPor === "humano") {
    return (
      <span
        data-slot="selo-confianca"
        className={cn(
          "inline-flex items-center gap-1 font-mono text-rotulo text-alta",
          className,
        )}
        title="Campo revisado por um humano"
      >
        <BadgeCheck className="size-3.5" aria-hidden />
        humano
      </span>
    );
  }

  const pct = Math.round(confianca * 100);
  const baixa = confianca < LIMIAR_INCERTEZA;
  return (
    <span
      data-slot="selo-confianca"
      className={cn(
        "inline-flex items-center gap-1 font-mono text-rotulo tabular-nums",
        baixa
          ? "rounded-sm bg-aviso px-1.5 py-0.5 text-sobre-aviso"
          : "text-texto-tenue",
        className,
      )}
      title={
        baixa
          ? `Extraído pela IA com ${pct}% de confiança: abaixo do limiar, está na fila de incerteza`
          : `Extraído pela IA com ${pct}% de confiança`
      }
    >
      <Bot className="size-3.5" aria-hidden />
      ia {pct}%
    </span>
  );
}
