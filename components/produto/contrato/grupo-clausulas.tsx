import * as React from "react";

import { SeloConfianca } from "@/components/produto/selo-confianca";
import { Semaforo } from "@/components/watchdog/semaforo";
import { diasAte } from "@/lib/data/regras";
import type { Clausula, StatusClausula, TipoClausula } from "@/lib/data/tipos";
import { dataCurta, reais } from "@/lib/demo/formata";
import { cn } from "@/lib/utils";

/**
 * As clausulas agrupadas por tipo, com prazo, valor, responsavel e o selo de
 * origem em cada uma. O texto original fica a um clique, nunca escondido.
 */

const ORDEM_TIPOS: TipoClausula[] = [
  "prazo",
  "valor",
  "obrigacao",
  "reajuste",
  "multa",
  "renovacao",
];

const ROTULO_GRUPO: Record<TipoClausula, string> = {
  prazo: "Prazos",
  valor: "Valores",
  obrigacao: "Obrigações",
  reajuste: "Reajustes",
  multa: "Multas",
  renovacao: "Renovações",
};

const SELO_STATUS_CLAUSULA: Record<StatusClausula, { rotulo: string; classe: string }> = {
  pendente: { rotulo: "pendente", classe: "bg-papel-fundo text-texto-suave" },
  cumprida: { rotulo: "cumprida", classe: "bg-alta text-sobre-alta" },
  atrasada: { rotulo: "atrasada", classe: "bg-queda text-sobre-queda" },
  aceita: { rotulo: "aceita", classe: "bg-alta/12 text-alta" },
  recusada: { rotulo: "recusada", classe: "bg-queda/12 text-queda" },
};

function LinhaClausula({ c, hoje }: { c: Clausula; hoje: string }) {
  const selo = SELO_STATUS_CLAUSULA[c.status];
  const encerrada = c.status === "cumprida" || c.status === "aceita";
  return (
    <li className="flex flex-col gap-2 border-b border-linha py-3.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="flex items-baseline gap-3 sm:w-48 sm:shrink-0">
        {c.dataLimite ? (
          <>
            <Semaforo
              dias={diasAte(c.dataLimite, hoje)}
              cumprida={encerrada}
            />
            <time className="font-mono text-rotulo whitespace-nowrap text-texto-suave tabular-nums">
              {dataCurta(c.dataLimite)}
            </time>
          </>
        ) : (
          <span className="text-rotulo text-texto-tenue">sem data</span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-corpo",
            encerrada ? "text-texto-suave" : "text-texto",
          )}
        >
          {c.resumoSimplificado}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-mono text-rotulo",
              selo.classe,
            )}
          >
            {selo.rotulo}
          </span>
          <span className="text-rotulo text-texto-tenue">
            responsável: {c.responsavel}
          </span>
          <SeloConfianca confianca={c.confianca} revisadoPor={c.revisadoPor} />
        </span>
        <details className="mt-1">
          <summary className="cursor-pointer text-rotulo text-texto-tenue underline decoration-dotted underline-offset-2 hover:text-texto-suave">
            ver o texto original
          </summary>
          <blockquote className="mt-2 border-l-2 border-linha-campo pl-3 text-corpo text-texto-suave">
            {'"'}
            {c.textoOriginal}
            {'"'}
          </blockquote>
        </details>
      </span>

      {c.valorCentavos ? (
        <span className="font-mono text-corpo text-texto tabular-nums sm:w-28 sm:text-right">
          {reais(c.valorCentavos / 100)}
        </span>
      ) : null}
    </li>
  );
}

export function GrupoClausulas({
  clausulas,
  hoje,
}: {
  clausulas: Clausula[];
  hoje: string;
}) {
  const grupos = ORDEM_TIPOS.map((tipo) => ({
    tipo,
    itens: clausulas.filter((c) => c.tipo === tipo),
  })).filter((g) => g.itens.length > 0);

  if (grupos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-linha-campo bg-papel px-6 py-10 text-center text-ui text-texto-suave">
        Nenhuma cláusula extraída deste contrato ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {grupos.map((g) => (
        <section key={g.tipo} className="rounded-lg bg-papel p-5 shadow-papel">
          <h3 className="flex items-baseline gap-2 text-rotulo text-texto-tenue uppercase">
            {ROTULO_GRUPO[g.tipo]}
            <span className="font-mono tabular-nums">{g.itens.length}</span>
          </h3>
          <ul className="mt-2">
            {g.itens.map((c) => (
              <LinhaClausula key={c.id} c={c} hoje={hoje} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
