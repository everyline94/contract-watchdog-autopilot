"use server";

/**
 * A fila de incerteza: o que a IA nao resolveu com confianca suficiente espera
 * um humano assumir. Resolver um item recalcula o status do contrato na hora.
 */
import { agora, hojeISO } from "@/lib/clock";
import { sessaoAtual } from "./sessao";
import { db, derivaContrato, proximoId } from "./store";
import type {
  Clausula,
  ItemIncerteza,
  MotivoIncerteza,
} from "./tipos";

export type ItemIncertezaDetalhado = ItemIncerteza & {
  contratoTitulo: string;
  clausula: Clausula | null;
};

export type FiltroIncerteza = {
  motivo?: MotivoIncerteza;
  contratoId?: string;
};

export type DecisaoIncerteza = {
  itemId: string;
  /**
   * confirmar: a leitura da IA estava certa, so faltava um humano dizer.
   * corrigir: o humano preenche ou conserta o campo.
   * descartar: o item sai da fila sem mexer na clausula.
   */
  decisao: "confirmar" | "corrigir" | "descartar";
  interpretacao?: string;
  dataLimite?: string | null;
  valorCentavos?: number | null;
};

export async function listaIncerteza(
  filtro?: FiltroIncerteza,
): Promise<ItemIncertezaDetalhado[]> {
  const s = db();
  return s.incertezas
    .filter((i) => !i.assumidoPor)
    .filter((i) => !filtro?.motivo || i.motivo === filtro.motivo)
    .filter((i) => !filtro?.contratoId || i.contratoId === filtro.contratoId)
    .map((i) => ({
      ...i,
      contratoTitulo:
        s.contratos.find((c) => c.id === i.contratoId)?.titulo ?? i.contratoId,
      clausula: s.clausulas.find((c) => c.id === i.clausulaId) ?? null,
    }));
}

export async function resolveItemIncerteza(
  entrada: DecisaoIncerteza,
): Promise<{ ok: boolean; erro?: string }> {
  const s = db();
  const item = s.incertezas.find((i) => i.id === entrada.itemId);
  if (!item) return { ok: false, erro: "Item não encontrado na fila." };
  if (item.assumidoPor) return { ok: false, erro: "Item já foi resolvido." };

  const hoje = hojeISO(await agora());
  const { usuario } = await sessaoAtual();
  const clausula = s.clausulas.find((c) => c.id === item.clausulaId);

  if (entrada.decisao !== "descartar" && clausula) {
    if (entrada.decisao === "corrigir") {
      if (!entrada.interpretacao?.trim()) {
        return { ok: false, erro: "Descreva a leitura correta antes de salvar." };
      }
      clausula.resumoSimplificado = entrada.interpretacao.trim();
      if (entrada.dataLimite !== undefined) {
        clausula.dataLimite = entrada.dataLimite;
      }
      if (entrada.valorCentavos !== undefined) {
        clausula.valorCentavos = entrada.valorCentavos;
      }
    }
    clausula.revisadoPor = "humano";
    clausula.confianca = 1;
  }

  item.assumidoPor = usuario.nome;

  const rotulo: Record<DecisaoIncerteza["decisao"], string> = {
    confirmar: "confirmou a leitura da IA",
    corrigir: "corrigiu a leitura da IA",
    descartar: "descartou o item da fila",
  };
  s.eventos.push({
    id: proximoId(s, "ev"),
    contratoId: item.contratoId,
    tipo: "revisao_humana",
    quando: (await agora()).toISOString(),
    descricao: `${usuario.nome} ${rotulo[entrada.decisao]}: ${
      clausula?.resumoSimplificado ?? item.interpretacaoSugerida
    }`,
    autor: "humano",
  });

  derivaContrato(s, item.contratoId, hoje);
  return { ok: true };
}
