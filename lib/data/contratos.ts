"use server";

/**
 * Leituras de contrato do produto. Tudo devolve dado pronto pra tela; a tela
 * nao calcula regra nenhuma.
 */
import { agora, hojeISO } from "@/lib/clock";
import {
  contaObrigacoesComData,
  diasAte,
  proximoVencimento,
  revisadoPorDoContrato,
} from "./regras";
import { clausulasDe, db, derivaContrato } from "./store";
import type {
  Clausula,
  Contrato,
  EventoTimeline,
  ItemIncerteza,
  RespostaContraparte,
  StatusContrato,
} from "./tipos";

export type ContratoResumo = Contrato & {
  proximoVencimento: string | null;
  /** Dias ate o proximo vencimento; negativo e atraso. */
  diasProximo: number | null;
  clausulasTotal: number;
  clausulasAbertas: number;
  /** Humano so quando toda clausula foi revisada por gente. */
  revisadoPor: "ia" | "humano";
};

export type ObrigacaoProxima = {
  contratoId: string;
  contratoTitulo: string;
  clausulaId: string;
  resumo: string;
  dataLimite: string;
  dias: number;
  valorCentavos: number | null;
  temMultaNoContrato: boolean;
};

export type ResumoDashboard = {
  hoje: string;
  porStatus: Record<StatusContrato, number>;
  incertezasAbertas: number;
  valorEmAbertoCentavos: number;
  vencidas: ObrigacaoProxima[];
  proximas7: ObrigacaoProxima[];
  proximas30: ObrigacaoProxima[];
  recentes: ContratoResumo[];
};

export type DetalheContrato = {
  contrato: Contrato;
  clausulas: Clausula[];
  incertezas: ItemIncerteza[];
  eventos: EventoTimeline[];
  respostas: RespostaContraparte[];
  hoje: string;
  /** Humano so quando toda clausula foi revisada por gente. */
  revisadoPor: "ia" | "humano";
  /** Quantas obrigacoes em aberto tem data: e o que vai pra agenda. */
  obrigacoesComData: number;
};

const emAberto = (c: Clausula) =>
  c.status !== "cumprida" && c.status !== "aceita";

function montaResumo(contratoId: string, hoje: string): ContratoResumo | null {
  const s = db();
  const contrato = derivaContrato(s, contratoId, hoje);
  if (!contrato) return null;
  const clausulas = clausulasDe(s, contratoId);
  const proximo = proximoVencimento(clausulas);
  return {
    ...contrato,
    proximoVencimento: proximo,
    diasProximo: proximo ? diasAte(proximo, hoje) : null,
    clausulasTotal: clausulas.length,
    clausulasAbertas: clausulas.filter(emAberto).length,
    revisadoPor: revisadoPorDoContrato(clausulas),
  };
}

export async function listaContratos(
  filtro?: StatusContrato,
): Promise<ContratoResumo[]> {
  const s = db();
  const hoje = hojeISO(await agora());
  const todos = s.contratos
    .map((c) => montaResumo(c.id, hoje)!)
    .sort((a, b) => b.dataUpload.localeCompare(a.dataUpload));
  return filtro ? todos.filter((c) => c.status === filtro) : todos;
}

export async function resumoDashboard(): Promise<ResumoDashboard> {
  const s = db();
  const hoje = hojeISO(await agora());
  const recentes = await listaContratos();

  const porStatus: Record<StatusContrato, number> = {
    fechado: 0,
    pendente: 0,
    atrasado: 0,
    em_risco: 0,
    incerteza: 0,
  };
  for (const c of recentes) porStatus[c.status] += 1;

  const proximas: ObrigacaoProxima[] = [];
  for (const contrato of s.contratos) {
    const clausulas = clausulasDe(s, contrato.id);
    const temMulta = clausulas.some(
      (c) => c.tipo === "multa" && emAberto(c),
    );
    for (const c of clausulas) {
      if (!emAberto(c) || !c.dataLimite) continue;
      const dias = diasAte(c.dataLimite, hoje);
      if (dias > 30) continue;
      proximas.push({
        contratoId: contrato.id,
        contratoTitulo: contrato.titulo,
        clausulaId: c.id,
        resumo: c.resumoSimplificado,
        dataLimite: c.dataLimite,
        dias,
        valorCentavos: c.valorCentavos,
        temMultaNoContrato: temMulta,
      });
    }
  }
  proximas.sort((a, b) => a.dataLimite.localeCompare(b.dataLimite));

  // Mesmo filtro do laudo: multa prevista e reajuste nao sao recebiveis.
  const valorEmAbertoCentavos = s.clausulas
    .filter(
      (c) =>
        emAberto(c) &&
        c.valorCentavos &&
        c.tipo !== "multa" &&
        c.tipo !== "reajuste",
    )
    .reduce((soma, c) => soma + (c.valorCentavos ?? 0), 0);

  return {
    hoje,
    porStatus,
    incertezasAbertas: s.incertezas.filter((i) => !i.assumidoPor).length,
    valorEmAbertoCentavos,
    vencidas: proximas.filter((p) => p.dias < 0),
    proximas7: proximas.filter((p) => p.dias >= 0 && p.dias <= 7),
    proximas30: proximas.filter((p) => p.dias > 7),
    recentes,
  };
}

export async function buscaContrato(
  id: string,
): Promise<DetalheContrato | null> {
  const s = db();
  const hoje = hojeISO(await agora());
  const contrato = derivaContrato(s, id, hoje);
  if (!contrato) return null;
  const clausulas = clausulasDe(s, id);
  return {
    contrato,
    clausulas,
    revisadoPor: revisadoPorDoContrato(clausulas),
    obrigacoesComData: contaObrigacoesComData(clausulas),
    incertezas: s.incertezas.filter((i) => i.contratoId === id),
    eventos: s.eventos
      .filter((e) => e.contratoId === id)
      .sort((a, b) => b.quando.localeCompare(a.quando)),
    respostas: s.respostas.filter((r) => r.contratoId === id),
    hoje,
  };
}

export async function buscaContratoPorToken(
  token: string,
): Promise<DetalheContrato | null> {
  const s = db();
  const contrato = s.contratos.find((c) => c.tokenPublico === token);
  return contrato ? buscaContrato(contrato.id) : null;
}
