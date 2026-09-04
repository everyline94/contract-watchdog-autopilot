/**
 * O unico lugar do produto com estado: um singleton em memoria no servidor,
 * pendurado no globalThis pra sobreviver ao HMR do dev. E exatamente o que o
 * Supabase substitui depois; nenhum componente sabe que ele existe.
 */
import { agoraSemRequisicao, hojeISO } from "@/lib/clock";
import { criaSemente, type Semente } from "./mocks";
import { calculaStatusContrato, confiancaDoContrato } from "./regras";
import type {
  Clausula,
  Contrato,
  ItemIncerteza,
  ProvedorConector,
} from "./tipos";

/**
 * Estado de um item da fila. Semente fica congelada (null).
 *
 * Os itens semeados continuam andando por tempo, porque nao tem arquivo por
 * tras deles: sao a vitrine do painel. Arquivo que a pessoa sobe de verdade
 * anda por `leitura`, que e a leitura real rodando em segundo plano.
 */
export type Andamento = {
  iniciadoEm: number | null;
  /** Clausulas extraidas aguardando o form da contraparte na etapa revisao. */
  extraidas?: Omit<Clausula, "id" | "contratoId">[];
  /**
   * Leitura de verdade em curso. Enquanto `terminadaEm` for null o item fica
   * na etapa de extracao; no fim, ou `extraidas` tem as clausulas do PDF, ou
   * `erro` tem o que dizer para quem subiu.
   */
  leitura?: {
    comecouEm: number;
    terminadaEm: number | null;
    erro: string | null;
  };
};

export type Store = Semente & {
  andamento: Map<string, Andamento>;
  /** Instante do clique em Conectar, por provedor: o "conectando" tem fim. */
  conexoes: Map<ProvedorConector, number>;
  /** Instante do clique em sincronizar, por contrato. Mesma ideia. */
  sincronizacoes: Map<string, number>;
  seq: number;
};

declare global {
  var __watchdogStore: Store | undefined;
}

export function db(): Store {
  if (!globalThis.__watchdogStore) {
    const semente = criaSemente(hojeISO(agoraSemRequisicao()));
    globalThis.__watchdogStore = {
      ...semente,
      andamento: new Map(
        semente.filaUpload.map((i) => [i.id, { iniciadoEm: null }]),
      ),
      conexoes: new Map(),
      sincronizacoes: new Map(),
      seq: 100,
    };
  }
  return globalThis.__watchdogStore;
}

/** So para teste: a proxima chamada a db() replanta a semente. */
export function zeraStore(): void {
  globalThis.__watchdogStore = undefined;
}

export function proximoId(s: Store, prefixo: string): string {
  return `${prefixo}-${++s.seq}`;
}

export const clausulasDe = (s: Store, contratoId: string): Clausula[] =>
  s.clausulas.filter((c) => c.contratoId === contratoId);

export const incertezasAbertasDe = (
  s: Store,
  contratoId: string,
): ItemIncerteza[] =>
  s.incertezas.filter((i) => i.contratoId === contratoId && !i.assumidoPor);

/**
 * Recalcula status e confianca do contrato a partir das clausulas e da fila,
 * grava e devolve. Toda mutacao relevante chama isto; ninguem seta status na
 * mao.
 */
export function derivaContrato(
  s: Store,
  contratoId: string,
  hoje: string,
): Contrato | null {
  const contrato = s.contratos.find((c) => c.id === contratoId);
  if (!contrato) return null;
  const clausulas = clausulasDe(s, contratoId);
  contrato.status = calculaStatusContrato(
    clausulas,
    incertezasAbertasDe(s, contratoId).length,
    hoje,
  );
  contrato.confiancaExtracao = confiancaDoContrato(clausulas);
  return contrato;
}
