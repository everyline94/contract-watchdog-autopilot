import * as React from "react";

import { CapaPintada } from "@/components/capa-pintada";
import { FaixaMetricas } from "@/components/faixa-metricas";
import { NUMEROS } from "@/lib/demo/gabarito";

/**
 * Passo 1: o problema, antes de qualquer tela de produto.
 * Todos os numeros sao contados do gabarito em codigo, nunca digitados.
 */
export function Passo1() {
  return (
    <>
      <CapaPintada
        altura="min-h-[460px]"
        className="flex flex-col justify-between gap-10 p-6 sm:p-10"
      >
        <p className="text-rotulo uppercase text-sobre-capa/85">
          Três contratos de fornecedor de evento, lidos obrigação por
          obrigação
        </p>
        <h1 className="max-w-[980px] text-display font-semibold tracking-tight">
          {NUMEROS.pctNaoEscritas}% das datas que importam não estão escritas
          em lugar&nbsp;nenhum.
        </h1>
        <FaixaMetricas
          metricas={[
            {
              id: "obrigacoes",
              rotulo: "obrigações com dinheiro em jogo",
              valor: String(NUMEROS.obrigacoes),
            },
            {
              id: "datas",
              rotulo: "delas são datas",
              valor: String(NUMEROS.datas),
            },
            {
              id: "escritas",
              rotulo: "escritas no contrato",
              valor: String(NUMEROS.escritas),
            },
            {
              id: "calculadas",
              rotulo: "precisam de conta",
              valor: String(NUMEROS.calculadas),
            },
            {
              id: "inexistentes",
              rotulo: "nem existem ainda",
              valor: String(NUMEROS.semExistir),
            },
          ]}
        />
      </CapaPintada>

      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5">
        <p className="text-lede text-texto">
          Contamos, uma a uma, as obrigações com consequência financeira de
          três contratos de fornecedor de evento, dois montados de modelos
          reais e um derivado de contrato real anonimizado:{" "}
          {NUMEROS.obrigacoes}. Destas, {NUMEROS.datas}{" "}
          são datas, e só {NUMEROS.escritas} estão escritas no documento. As
          outras {NUMEROS.naoEscritas} ou são uma conta que alguém precisa
          lembrar de fazer, ou nem existem até a outra parte responder uma
          pergunta.
        </p>
        <p className="text-lede text-texto-suave">
          “O saldo é pago até sete dias antes do evento” não é uma data: é uma
          regra. Planilha, lembrete e agenda guardam datas, e por isso não
          resolvem. O que vem a seguir é o sistema que lê a regra, faz a conta
          e vigia o resultado sozinho.
        </p>
      </div>
    </>
  );
}
