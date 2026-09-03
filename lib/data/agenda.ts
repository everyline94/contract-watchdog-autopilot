"use server";

/**
 * A sincronizacao das datas do contrato com a agenda da pessoa.
 *
 * Nesta etapa e SIMULADA: nao ha OAuth, nao ha evento criado em calendario
 * nenhum, nao ha chamada pra fora. O que e real e a conta: o total que a tela
 * mostra sai das clausulas do contrato pela regra pura de lib/data/regras.ts,
 * nao de um numero escrito na mao.
 */
import { agora } from "@/lib/clock";
import { contaObrigacoesComData } from "./regras";
import { clausulasDe, db, type Store } from "./store";
import type { ProvedorAgenda, SincronizacaoAgenda } from "./tipos";

/** Quanto tempo o estado "sincronizando" fica na tela. */
const DURACAO_SINCRONIA_MS = 1500;

const desconectada = (contratoId: string): SincronizacaoAgenda => ({
  contratoId,
  provedor: null,
  estado: "desconectada",
  total: 0,
  quando: null,
});

/** Fecha as sincronizacoes que ja passaram da duracao. Muta o store. */
function avancaAgendas(s: Store, agoraISO: string): void {
  for (const agenda of s.agendas) {
    if (agenda.estado !== "sincronizando") continue;
    const iniciadoEm = s.sincronizacoes.get(agenda.contratoId);
    if (iniciadoEm === undefined) continue;
    if (Date.now() - iniciadoEm < DURACAO_SINCRONIA_MS) continue;
    agenda.estado = "sincronizada";
    agenda.quando = agoraISO;
    s.sincronizacoes.delete(agenda.contratoId);
  }
}

export async function estadoAgenda(
  contratoId: string,
): Promise<SincronizacaoAgenda> {
  const s = db();
  avancaAgendas(s, (await agora()).toISOString());
  return (
    s.agendas.find((a) => a.contratoId === contratoId) ??
    desconectada(contratoId)
  );
}

export async function sincronizaAgenda(entrada: {
  contratoId: string;
  provedor: ProvedorAgenda;
}): Promise<SincronizacaoAgenda> {
  const s = db();
  const agoraISO = (await agora()).toISOString();
  avancaAgendas(s, agoraISO);

  const contrato = s.contratos.find((c) => c.id === entrada.contratoId);
  if (!contrato) return desconectada(entrada.contratoId);

  const total = contaObrigacoesComData(clausulasDe(s, contrato.id));
  const existente = s.agendas.find((a) => a.contratoId === contrato.id);
  const agenda: SincronizacaoAgenda = {
    contratoId: contrato.id,
    provedor: entrada.provedor,
    estado: "sincronizando",
    total,
    quando: existente?.quando ?? null,
  };

  if (existente) Object.assign(existente, agenda);
  else s.agendas.push(agenda);
  s.sincronizacoes.set(contrato.id, Date.now());

  return existente ?? agenda;
}
