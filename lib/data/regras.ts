/**
 * As regras de negocio do produto, puras: sem IO, sem relogio proprio (o hoje
 * entra por parametro), sem estado. Tudo aqui tem teste em
 * tests/regras-produto.test.ts.
 */
import { differenceInCalendarDays } from "date-fns";

import { deISO } from "@/lib/motor-datas";
import {
  LIMIAR_INCERTEZA,
  type AcaoContraparte,
  type Clausula,
  type ItemIncerteza,
  type StatusContrato,
} from "./tipos";

/** Dias de hoje ate a data. Negativo e atraso. */
export function diasAte(dataISO: string, hojeISO: string): number {
  return differenceInCalendarDays(deISO(dataISO), deISO(hojeISO));
}

/** Ainda espera acao: nem cumprida, nem aceita. Recusada segue em aberto. */
const emAberto = (c: Clausula) =>
  c.status !== "cumprida" && c.status !== "aceita";

/** Passou do prazo sem cumprimento, seja qual for o status gravado. */
export function clausulaAtrasada(c: Clausula, hoje: string): boolean {
  if (!emAberto(c) || !c.dataLimite) return false;
  return c.status === "atrasada" || diasAte(c.dataLimite, hoje) < 0;
}

/** Vence em ate 7 dias (hoje conta). */
export function clausulaVenceEmBreve(c: Clausula, hoje: string): boolean {
  if (!emAberto(c) || !c.dataLimite) return false;
  const dias = diasAte(c.dataLimite, hoje);
  return dias >= 0 && dias <= 7;
}

/**
 * O status do contrato deriva das clausulas e da fila; ninguem grava status na
 * mao. Precedencia, da mais grave pra mais leve:
 *
 * 1. incerteza: 1+ item aberto na fila humana. Sobrepoe tudo, porque um
 *    contrato com campo nao confiavel nao e confiavel inteiro.
 * 2. atrasado: alguma obrigacao passou do prazo sem cumprimento.
 * 3. em_risco: alguma obrigacao vence em ate 7 dias, ou ha obrigacao em
 *    aberto vencendo em ate 30 dias num contrato que preve multa. A janela
 *    importa: quase todo contrato de evento tem clausula de multa, e sem
 *    ela quase toda carteira ficaria "em risco" pra sempre.
 * 4. fechado: todas cumpridas ou aceitas.
 * 5. pendente: o resto.
 */
export function calculaStatusContrato(
  clausulas: Clausula[],
  incertezasAbertas: number,
  hoje: string,
): StatusContrato {
  if (incertezasAbertas > 0) return "incerteza";
  if (clausulas.some((c) => clausulaAtrasada(c, hoje))) return "atrasado";

  const temMulta = clausulas.some((c) => c.tipo === "multa" && emAberto(c));
  const abertaVencendoEm30 = clausulas.some((c) => {
    if (!emAberto(c) || !c.dataLimite) return false;
    const dias = diasAte(c.dataLimite, hoje);
    return dias >= 0 && dias <= 30;
  });
  if (
    clausulas.some((c) => clausulaVenceEmBreve(c, hoje)) ||
    (temMulta && abertaVencendoEm30)
  ) {
    return "em_risco";
  }

  if (clausulas.length > 0 && clausulas.every((c) => !emAberto(c))) {
    return "fechado";
  }
  return "pendente";
}

/**
 * As clausulas que a resposta da contraparte alcanca. Contato nao alcanca
 * nenhuma: registra a conversa e para ai. Com clausula especifica, so ela.
 * Sem clausula, a resposta cobre exatamente o que a notificacao apresentou
 * como pendencia (em aberto, sem multa e sem reajuste), e aceite nao sobrepoe
 * recusa anterior: renegociacao aberta se resolve conversando.
 */
export function clausulasAlvoDaResposta(
  clausulas: Clausula[],
  acao: AcaoContraparte,
  clausulaId?: string | null,
): Clausula[] {
  if (acao === "contato") return [];
  if (clausulaId) return clausulas.filter((c) => c.id === clausulaId);
  return clausulas.filter(
    (c) =>
      emAberto(c) &&
      c.status !== "recusada" &&
      c.tipo !== "multa" &&
      c.tipo !== "reajuste",
  );
}

/** Toda clausula abaixo do limiar vira item de incerteza, sem excecao. */
export function geraItensIncerteza(
  clausulas: Clausula[],
  jaAbertos: ItemIncerteza[] = [],
): Omit<ItemIncerteza, "id">[] {
  const cobertos = new Set(jaAbertos.map((i) => i.clausulaId));
  return clausulas
    .filter(
      (c) =>
        c.revisadoPor === "ia" &&
        c.confianca < LIMIAR_INCERTEZA &&
        !cobertos.has(c.id),
    )
    .map((c) => ({
      contratoId: c.contratoId,
      clausulaId: c.id,
      motivo: "baixa_confianca" as const,
      trechoBruto: c.textoOriginal,
      paginaPreviewUrl: null,
      interpretacaoSugerida: c.resumoSimplificado,
      confianca: c.confianca,
      assumidoPor: null,
    }));
}

/** A data em aberto mais proxima (vencidas primeiro, por mais antiga). */
export function proximoVencimento(
  clausulas: Clausula[],
): string | null {
  const datas = clausulas
    .filter((c) => emAberto(c) && c.dataLimite)
    .map((c) => c.dataLimite!)
    .sort();
  return datas[0] ?? null;
}

/**
 * Quantas obrigacoes o contrato manda pra agenda: as que ainda esperam acao E
 * tem data. Sem data nao vira evento, e cumprida ou aceita nao volta pro
 * calendario de ninguem.
 */
export function contaObrigacoesComData(clausulas: Clausula[]): number {
  return clausulas.filter((c) => emAberto(c) && c.dataLimite).length;
}

/** A menor confianca entre os campos: e ela que o cabecalho do contrato mostra. */
export function confiancaDoContrato(clausulas: Clausula[]): number {
  if (clausulas.length === 0) return 1;
  return Math.min(...clausulas.map((c) => c.confianca));
}

/** O selo do contrato: humano so quando todo campo foi revisado por gente. */
export function revisadoPorDoContrato(
  clausulas: Clausula[],
): "ia" | "humano" {
  if (clausulas.length === 0) return "ia";
  return clausulas.every((c) => c.revisadoPor === "humano") ? "humano" : "ia";
}
