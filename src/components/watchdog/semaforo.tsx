import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * O semaforo de urgencia.
 *
 * A regra do Cinnabar e que a cor so aparece onde tem dado, entao o estado
 * neutro nao pinta nada: prazo longe e texto comum. Quando pinta, pesa.
 *
 * A faixa nao e estetica, e a janela de alerta do monitor: vermelho e a semana
 * em que a acao precisa sair.
 */
export type Urgencia =
  | "cumprida"
  | "inativa"
  | "vencido"
  | "esta-semana"
  | "este-mes"
  | "distante"
  | "pendente";

export function urgenciaDe(
  diasRestantes: number | null,
  extra?: { cumprida?: boolean; inativa?: boolean },
): Urgencia {
  // Cumprida vence tudo: uma parcela paga com atraso nao e mais "vencido".
  if (extra?.cumprida) return "cumprida";
  if (extra?.inativa) return "inativa";
  if (diasRestantes === null) return "pendente";
  if (diasRestantes < 0) return "vencido";
  if (diasRestantes <= 7) return "esta-semana";
  if (diasRestantes <= 30) return "este-mes";
  return "distante";
}

const estilos: Record<Urgencia, string> = {
  cumprida: "bg-alta text-sobre-alta",
  inativa: "bg-papel-fundo text-texto-tenue",
  vencido: "bg-queda text-sobre-queda",
  "esta-semana": "bg-queda/12 text-queda",
  "este-mes": "bg-aviso text-sobre-aviso",
  distante: "bg-papel-fundo text-texto-suave",
  pendente: "border border-dashed border-linha-campo text-texto-suave",
};

const rotulos: Record<Urgencia, string> = {
  cumprida: "feita",
  inativa: "condição desativada",
  vencido: "vencido",
  "esta-semana": "esta semana",
  "este-mes": "este mês",
  distante: "no prazo",
  pendente: "sem data",
};

export function Semaforo({
  dias,
  cumprida = false,
  inativa = false,
  className,
}: {
  /** Dias ate o vencimento. Negativo e atraso, null e data ainda nao conhecida. */
  dias: number | null;
  /** Marcada como feita pelo humano: pinta de sucesso, sem contagem. */
  cumprida?: boolean;
  /** Condicao que nao se realiza mais: sem urgencia a mostrar. */
  inativa?: boolean;
  className?: string;
}) {
  const u = urgenciaDe(dias, { cumprida, inativa });
  const texto =
    u === "cumprida"
      ? "feita"
      : u === "inativa"
        ? "inativa"
        : u === "pendente"
          ? rotulos.pendente
          : u === "vencido"
            ? `há ${Math.abs(dias!)} d`
            : dias === 0
              ? "hoje"
              : `em ${dias} d`;

  return (
    <span
      data-slot="semaforo"
      data-urgencia={u}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1",
        "font-mono text-rotulo tabular-nums",
        estilos[u],
        className
      )}
      title={rotulos[u]}
    >
      {texto}
    </span>
  );
}
