import * as React from "react";

import { CapaPintada } from "@/components/capa-pintada";
import { Secao } from "@/components/blocos-pagina";
import { PaginaDestacada } from "@/components/watchdog/pagina-destacada";
import {
  CONTRATO_ESTUDIO,
  CONTRATO_FILMAGEM,
  CONTRATO_SHOW,
} from "@/lib/demo/contratos";

/**
 * Passo 6: onde o humano entra, os dois lados da mesa, e a frase final.
 */
export function Passo6() {
  const cartoes = [
    {
      id: "show",
      capa: "a-capa",
      nome: CONTRATO_SHOW.nome,
      contraparte: CONTRATO_SHOW.contraparte,
      papel: "ele é o fornecedor",
      fato: `${CONTRATO_SHOW.obrigacoes.length} obrigações de prazo vigiadas, evento em dezembro de 2026`,
    },
    {
      id: "estudio",
      capa: "b-capa",
      nome: CONTRATO_ESTUDIO.nome,
      contraparte: CONTRATO_ESTUDIO.contraparte,
      papel: "ele é o fornecedor",
      fato: "uma data escrita no documento inteiro, o resto perguntado e calculado",
    },
    {
      id: "filmagem",
      capa: "c-capa",
      nome: CONTRATO_FILMAGEM.nome,
      contraparte: CONTRATO_FILMAGEM.contraparte,
      papel: "aqui ele é o cliente",
      fato: "o próprio casamento, em 2026: mesmo motor, outro lado da mesa",
    },
  ];

  return (
    <>
      <Secao
        titulo="Onde o humano entra, e onde não precisa mais"
        descricao="O critério que separa isto de um leitor de contrato: o que roda sem gente, e os dois únicos lugares onde uma pessoa decide."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-lg bg-papel p-6 shadow-papel">
            <p className="text-rotulo uppercase text-texto-tenue">
              o sistema faz sozinho
            </p>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-corpo text-texto">
              <li>lê o documento e extrai cada campo com cláusula, página e citação literal</li>
              <li>calcula as datas que não estão escritas, com regra de dia útil e feriado</li>
              <li>audita a coerência do próprio contrato e avisa quando o papel se contradiz</li>
              <li>vigia todo dia às 06:00, avaliando as condições daquele dia</li>
              <li>escreve a cobrança com o valor daquele dia, juro pro rata incluído</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 rounded-lg bg-papel p-6 shadow-papel">
            <p className="text-rotulo uppercase text-texto-tenue">
              o humano entra em dois lugares
            </p>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-corpo text-texto">
              <li>
                responde o que o documento não diz: você viu uma resposta
                destravar as datas do segundo contrato de uma vez
              </li>
              <li>decide o que é decisão de negócio: cobrar, ir ou não ir, rescindir</li>
            </ul>
            <p className="text-corpo text-texto-suave">
              Fora isso, não tem gente na alça. A IA lê e cita; quem calcula é
              código com teste, então não existe data alucinada no calendário.
            </p>
          </div>
        </div>
      </Secao>

      <Secao
        titulo="Os dois lados da mesa"
        descricao="O mesmo profissional subiu três contratos: em dois ele vende, no terceiro ele contrata. Cada documento que entra traz o nome e o preço de quem está do outro lado, e a rede se mapeia sozinha."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {cartoes.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-3 rounded-lg bg-papel p-4 shadow-papel"
            >
              <PaginaDestacada nome={c.capa} alt={`Primeira página: ${c.nome}`} />
              <div className="flex flex-col gap-1">
                <p className="text-rotulo uppercase text-texto-tenue">
                  {c.papel}
                </p>
                <p className="text-corpo font-medium text-texto">{c.nome}</p>
                <p className="text-ui text-texto-suave">{c.contraparte}</p>
                <p className="text-ui text-texto-suave">{c.fato}</p>
              </div>
            </div>
          ))}
        </div>
      </Secao>

      <CapaPintada altura="min-h-64" className="flex flex-col justify-center gap-5 p-6 sm:p-10">
        <p className="max-w-[860px] text-h2 font-semibold tracking-tight">
          Leitor de contrato responde quando alguém pergunta. Isto aqui vigia
          sozinho e chega antes.
        </p>
        <p className="max-w-[860px] text-corpo opacity-80">
          Para qualquer PME que assina contratos e não tem jurídico, o Contract
          Watchdog lê os contratos e avisa antes de cada vencimento, reajuste e
          renovação. Um produto horizontal que conquista o mercado nicho a
          nicho, começando por&nbsp;eventos.
        </p>
      </CapaPintada>
    </>
  );
}
