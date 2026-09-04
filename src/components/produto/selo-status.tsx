import * as React from "react";

import type { StatusContrato } from "@/lib/data/tipos";
import { cn } from "@/lib/utils";

/**
 * O status do contrato como pilula, na mesma anatomia do Semaforo: mono,
 * miudo, cor so onde ha gravidade. Incerteza ganha a brasa porque e o unico
 * status que pede um humano, nao o tempo; o contorno tracejado separa essa
 * pilula da "fechado", que divide o mesmo verde na mesma coluna.
 */

const estilos: Record<StatusContrato, string> = {
  fechado: "bg-alta text-sobre-alta",
  pendente: "bg-papel-fundo text-texto-suave",
  atrasado: "bg-queda text-sobre-queda",
  em_risco: "bg-aviso text-sobre-aviso",
  incerteza: "border-dashed border-brasa/50 bg-brasa/12 text-brasa",
};

export const ROTULOS_STATUS: Record<StatusContrato, string> = {
  fechado: "fechado",
  pendente: "pendente",
  atrasado: "atrasado",
  em_risco: "em risco",
  incerteza: "incerteza",
};

export function SeloStatus({
  status,
  className,
}: {
  status: StatusContrato;
  className?: string;
}) {
  return (
    <span
      data-slot="selo-status"
      data-status={status}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-transparent px-2.5 py-1 font-mono text-rotulo",
        estilos[status],
        className,
      )}
    >
      {ROTULOS_STATUS[status]}
    </span>
  );
}
