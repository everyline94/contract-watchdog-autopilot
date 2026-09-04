/**
 * O que o monitor das 06:00 mandaria hoje, montado ao vivo.
 *
 * O envio de e-mail ainda nao existe; o conteudo dele sim, porque tudo que o
 * e-mail diz sai do motor: mora pro rata die do dia, clausula com pagina, e a
 * data da decisao de comparecimento. A tela mostra a mensagem como ela seria.
 */
import {
  calculaMora,
  deISO,
  paraISO,
  somaDias,
  type Mora,
} from "@/lib/motor-datas";
import type { ContratoDemo } from "./contratos";
import type { Linha } from "./resolve";

export type CobrancaDoDia = {
  linha: Linha;
  mora: Mora;
};

export type EmailDoMonitor = {
  assunto: string;
  cobrancas: CobrancaDoDia[];
  totalHoje: number;
  totalAmanha: number;
  decisao?: Linha;
  divergencia?: string;
};

export function montaEmail(
  contrato: ContratoDemo,
  linhas: Linha[],
  hoje: string,
): EmailDoMonitor | null {
  const vencidas = linhas.filter(
    (l) => l.cobravel && l.valor && l.dias !== null && l.dias < 0 && !l.cumpridaEm,
  );
  if (vencidas.length === 0) return null;

  const amanha = paraISO(somaDias(deISO(hoje), 1));
  const regra = contrato.mora;

  const cobrancas = vencidas.map((linha) => ({
    linha,
    mora: calculaMora(linha.valor!, linha.data!, hoje, regra),
  }));
  const totalHoje = soma(cobrancas.map((c) => c.mora.total));
  const totalAmanha = soma(
    vencidas.map((l) => calculaMora(l.valor!, l.data!, amanha, regra).total),
  );

  const maisRecente = vencidas[vencidas.length - 1];
  const decisao = linhas.find(
    (l) =>
      l.condicao?.includes("parcela em aberto") &&
      l.data !== null &&
      !l.condicaoDesativada,
  );

  return {
    assunto: `${maisRecente.titulo} em aberto: há decisão com prazo neste contrato`,
    cobrancas,
    totalHoje,
    totalAmanha,
    decisao,
    divergencia: vencidas.find((l) => l.divergencia)?.divergencia,
  };
}

const soma = (valores: number[]) =>
  Math.round(valores.reduce((a, b) => a + b, 0) * 100) / 100;
