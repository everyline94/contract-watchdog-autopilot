import Link from "next/link";
import * as React from "react";

import { Semaforo } from "@/components/watchdog/semaforo";
import type { ObrigacaoProxima } from "@/lib/data/contratos";
import { dataCurta, reais } from "@/lib/demo/formata";

/**
 * O bloco de proximas obrigacoes do dashboard: a semana e o mes, somando a
 * carteira inteira. E a "visao carteira" em miniatura: o que o fornecedor de
 * 20 contratos abriria o app pra ver.
 */

function LinhaProxima({ o }: { o: ObrigacaoProxima }) {
  return (
    <li className="flex flex-col gap-1.5 border-b border-linha py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="flex items-baseline gap-3 sm:w-44 sm:shrink-0">
        <Semaforo dias={o.dias} />
        <time className="font-mono text-rotulo whitespace-nowrap text-texto-suave tabular-nums">
          {dataCurta(o.dataLimite)}
        </time>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-corpo text-texto">{o.resumo}</span>
        <Link
          href={`/app/contratos/${o.contratoId}`}
          className="text-rotulo text-texto-tenue underline decoration-dotted underline-offset-2 hover:text-texto-suave"
        >
          {o.contratoTitulo}
        </Link>
        {o.temMultaNoContrato ? (
          <span className="ml-2 rounded-sm bg-aviso px-1.5 py-0.5 font-mono text-rotulo text-sobre-aviso">
            contrato com multa
          </span>
        ) : null}
      </span>
      {o.valorCentavos ? (
        <span className="font-mono text-corpo text-texto tabular-nums sm:w-28 sm:text-right">
          {reais(o.valorCentavos / 100)}
        </span>
      ) : null}
    </li>
  );
}

export function ProximasObrigacoes({
  vencidas = [],
  proximas7,
  proximas30,
}: {
  vencidas?: ObrigacaoProxima[];
  proximas7: ObrigacaoProxima[];
  proximas30: ObrigacaoProxima[];
}) {
  return (
    <div className="flex flex-col gap-5">
      {vencidas.length > 0 ? (
        <div className="rounded-lg bg-papel p-5 shadow-papel">
          <h3 className="text-rotulo text-queda uppercase">Vencidas</h3>
          <ul className="mt-2">
            {vencidas.map((o) => (
              <LinhaProxima key={o.clausulaId} o={o} />
            ))}
          </ul>
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg bg-papel p-5 shadow-papel">
          <h3 className="text-rotulo text-texto-tenue uppercase">
            Vence em até 7 dias
          </h3>
          {proximas7.length === 0 ? (
            <p className="mt-3 text-ui text-texto-suave">
              Nada vence nesta semana. A carteira respira.
            </p>
          ) : (
            <ul className="mt-2">
              {proximas7.map((o) => (
                <LinhaProxima key={o.clausulaId} o={o} />
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg bg-papel p-5 shadow-papel">
          <h3 className="text-rotulo text-texto-tenue uppercase">
            De 8 a 30 dias
          </h3>
          {proximas30.length === 0 ? (
            <p className="mt-3 text-ui text-texto-suave">
              Nenhuma obrigação na janela do mês.
            </p>
          ) : (
            <ul className="mt-2">
              {proximas30.map((o) => (
                <LinhaProxima key={o.clausulaId} o={o} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
