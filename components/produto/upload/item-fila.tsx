"use client";

import Link from "next/link";
import * as React from "react";
import { Check, CircleAlert, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EtapaUpload, ItemFilaUpload } from "@/lib/data/tipos";
import { cn } from "@/lib/utils";

/**
 * Um item da fila com as cinco etapas visiveis. O erro e desenhado NA etapa
 * em que aconteceu, nao num banner generico: a pessoa ve onde parou.
 */

const ETAPAS: { id: EtapaUpload; rotulo: string }[] = [
  { id: "upload", rotulo: "Upload" },
  { id: "leitura", rotulo: "Leitura" },
  { id: "extracao", rotulo: "Extração de cláusulas" },
  { id: "revisao", rotulo: "Revisão" },
  { id: "concluido", rotulo: "Concluído" },
];

const ORDEM: Record<EtapaUpload, number> = {
  upload: 0,
  leitura: 1,
  extracao: 2,
  revisao: 3,
  concluido: 4,
};

function Etapa({
  rotulo,
  estado,
  progresso,
  erro,
}: {
  rotulo: string;
  estado: "feita" | "atual" | "futura" | "erro";
  progresso: number;
  erro: string | null;
}) {
  return (
    <li className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full",
            estado === "feita" && "bg-tinta text-sobre-tinta",
            estado === "atual" && "border-2 border-tinta text-texto",
            estado === "futura" && "border border-linha text-texto-tenue",
            estado === "erro" && "bg-queda text-sobre-queda",
          )}
        >
          {estado === "feita" ? (
            <Check className="size-3" aria-hidden />
          ) : estado === "erro" ? (
            <CircleAlert className="size-3" aria-hidden />
          ) : null}
        </span>
        <span
          className={cn(
            "truncate text-rotulo",
            estado === "futura" ? "text-texto-tenue" : "text-texto-suave",
            estado === "erro" && "text-queda",
          )}
        >
          {rotulo}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-papel-fundo">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            estado === "erro" ? "bg-queda" : "bg-tinta",
          )}
          style={{
            width:
              estado === "feita"
                ? "100%"
                : estado === "atual" || estado === "erro"
                  ? `${progresso}%`
                  : "0%",
          }}
        />
      </div>
      {estado === "erro" && erro ? (
        <p className="text-rotulo text-queda">{erro}</p>
      ) : null}
    </li>
  );
}

export function ItemFila({
  item,
  revisando,
  aoRevisar,
}: {
  item: ItemFilaUpload;
  revisando: boolean;
  aoRevisar: () => void;
}) {
  const atual = ORDEM[item.etapa];

  // Enquanto as etapas automaticas rodam, a pessoa ve o processo: a
  // porcentagem do contrato lido e o tempo contando, como no leitor do /ler.
  const lendo =
    !item.erro &&
    (item.etapa === "upload" ||
      item.etapa === "leitura" ||
      item.etapa === "extracao");
  const [decorrido, setDecorrido] = React.useState(0);
  React.useEffect(() => {
    if (!lendo) return;
    const inicio = Date.now();
    const timer = setInterval(
      () => setDecorrido(Math.round((Date.now() - inicio) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [lendo]);
  const pctLido = lendo
    ? Math.min(99, Math.round((atual * 100 + item.progresso) / 3))
    : 100;

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-lg bg-papel p-5 shadow-papel",
        revisando && "ring-2 ring-tinta",
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-texto-tenue" aria-hidden />
          <span className="truncate font-mono text-ui text-texto">
            {item.nomeArquivo}
          </span>
        </span>
        {lendo ? (
          <span className="font-mono text-rotulo text-texto-suave tabular-nums">
            lendo {pctLido}% · {Math.floor(decorrido / 60)}:
            {String(decorrido % 60).padStart(2, "0")}
          </span>
        ) : item.etapa === "revisao" && !item.erro ? (
          <Button size="sm" variant="outline" onClick={aoRevisar}>
            {revisando ? "Revisando abaixo" : "Revisar e concluir"}
          </Button>
        ) : item.etapa === "concluido" && item.contratoId ? (
          <Link
            href={`/app/contratos/${item.contratoId}`}
            className="text-ui font-medium text-brasa underline decoration-brasa/40 underline-offset-2 hover:decoration-brasa"
          >
            Abrir contrato
          </Link>
        ) : null}
      </header>

      <ol className="flex flex-col gap-3 sm:flex-row sm:gap-2">
        {ETAPAS.map((e, i) => (
          <Etapa
            key={e.id}
            rotulo={e.rotulo}
            progresso={item.progresso}
            erro={item.erro}
            estado={
              item.erro && e.id === item.etapa
                ? "erro"
                : i < atual || item.etapa === "concluido"
                  ? "feita"
                  : i === atual
                    ? "atual"
                    : "futura"
            }
          />
        ))}
      </ol>
    </article>
  );
}
