/**
 * Liga os contratos da demo ao motor. Roda a cada request: nada aqui e
 * pre-calculado, e mudar o relogio muda o resultado.
 */
import { differenceInCalendarDays } from "date-fns";

import { feriadosPadrao } from "@/lib/feriados";
import {
  auditaCoerencia,
  calculaMora,
  deISO,
  resolvePrazo,
  type Ancoras,
  type Mora,
} from "@/lib/motor-datas";
import type { ContratoDemo, EvidenciaDemo, ObrigacaoDemo } from "./contratos";

// A mesma janela do leitor ao vivo (src/lib/feriados.ts): duas janelas
// divergentes ja fizeram a demo e o /ler calcularem diferente pro mesmo caso.
const FERIADOS = feriadosPadrao();

export type Linha = {
  id: string;
  titulo: string;
  detalhe?: string;
  valor?: number;
  cobravel?: boolean;
  /** null enquanto nao ha como calcular. */
  data: string | null;
  dias: number | null;
  /** true quando a data esta escrita no documento. */
  escrita: boolean;
  /** A origem dita para gente: "calculada: 30 dias antes do evento". */
  origem?: string;
  divergencia?: string;
  pendencia?: string;
  /** evento: destrava com a resposta da data. pergunta: outra pergunta aberta.
   *  estrutural: marco ou condicao, nao ha o que perguntar. */
  motivoPendencia?: "evento" | "pergunta" | "estrutural";
  condicao?: string;
  /** Acao recomendada quando a obrigacao e uma tarefa do usuario. */
  acao?: string;
  /** Data em que o humano marcou como feita (o hoje do relogio no clique). */
  cumpridaEm?: string;
  /** So existe quando cumprida DEPOIS do vencimento: mora parada em cumpridaEm. */
  moraCongelada?: Mora;
  /** true na condicional "parcela em aberto" quando toda cobravel foi quitada. */
  condicaoDesativada?: boolean;
  evidencia: EvidenciaDemo;
  /** A data crua da regra, antes da borda de dia util, para os avisos. */
  regraCrua?: string;
  regraAjustada?: string;
};

function resolveObrigacao(
  o: ObrigacaoDemo,
  ancoras: Ancoras,
  hoje: string,
): Linha {
  const base: Linha = {
    id: o.id,
    titulo: o.titulo,
    detalhe: o.detalhe,
    valor: o.valor,
    cobravel: o.cobravel,
    data: null,
    dias: null,
    escrita: Boolean(o.escritaNoPapel),
    condicao: o.condicao,
    acao: o.acao,
    evidencia: o.evidencia,
  };

  if (o.ehEvento) {
    const respondida = ancoras.evento ?? null;
    return {
      ...base,
      data: respondida,
      dias: respondida ? diasAte(respondida, hoje) : null,
      origem: respondida ? "respondida por você, agora" : undefined,
      pendencia: respondida ? undefined : o.semData,
      motivoPendencia: respondida ? undefined : "evento",
    };
  }

  if (o.semData || !o.regra) {
    if (o.escritaNoPapel) {
      return {
        ...base,
        data: o.escritaNoPapel,
        dias: diasAte(o.escritaNoPapel, hoje),
        origem: "escrita no contrato",
      };
    }
    return {
      ...base,
      pendencia: o.semData,
      motivoPendencia: o.pendenciaHumana ? "pergunta" : "estrutural",
    };
  }

  const resolvida = resolvePrazo(o.regra, ancoras, FERIADOS);
  // A auditoria compara a regra crua com o que o papel escreve: usar a data
  // ja antecipada por dia util inflaria a divergencia.
  const crua = resolvePrazo(o.regra, ancoras, FERIADOS, {
    ajustarBorda: false,
  });

  if (resolvida.pendencia) {
    return {
      ...base,
      origem: o.regraTexto,
      pendencia: "Depende da data do evento, que não consta no documento",
      motivoPendencia: "evento",
    };
  }

  const vigente = o.escritaNoPapel ?? resolvida.data;
  return {
    ...base,
    data: vigente,
    dias: vigente ? diasAte(vigente, hoje) : null,
    origem: o.escritaNoPapel
      ? "escrita no contrato"
      : `calculada: ${o.regraTexto}`,
    divergencia:
      auditaCoerencia(crua.data, o.escritaNoPapel ?? null) ?? undefined,
    regraCrua: crua.data ?? undefined,
    regraAjustada: resolvida.data ?? undefined,
  };
}

function diasAte(dataISO: string, hojeISO: string): number {
  return differenceInCalendarDays(deISO(dataISO), deISO(hojeISO));
}

export function resolveContrato(
  contrato: ContratoDemo,
  hoje: string,
  eventoRespondido?: string | null,
  feitos: Record<string, string> = {},
): Linha[] {
  const ancoras: Ancoras = {
    evento: contrato.evento ?? eventoRespondido ?? null,
    nomeadas: contrato.ancorasNomeadas,
  };
  const linhas = contrato.obrigacoes.map((o) =>
    resolveObrigacao(o, ancoras, hoje),
  );

  for (const l of linhas) {
    const quando = feitos[l.id];
    if (!quando) continue;
    l.cumpridaEm = quando;
    // Pagou depois do vencimento: a mora para de crescer no dia do pagamento,
    // nao no hoje. Comparacao de string funciona porque as duas sao ISO.
    if (l.cobravel && l.valor && l.data && quando > l.data) {
      l.moraCongelada = calculaMora(l.valor, l.data, quando, contrato.mora);
    }
  }

  const cobraveis = linhas.filter((l) => l.cobravel && l.valor);
  if (cobraveis.length > 0 && cobraveis.every((l) => l.cumpridaEm)) {
    for (const l of linhas) {
      if (l.condicao?.includes("parcela em aberto")) {
        l.condicaoDesativada = true;
      }
    }
  }

  return linhas.sort((a, b) =>
    (a.data ?? "9999").localeCompare(b.data ?? "9999"),
  );
}

/** Contagens que a tela mostra, contadas do resultado do motor. */
export function contagens(linhas: Linha[]) {
  const comData = linhas.filter((l) => l.data !== null);
  return {
    total: linhas.length,
    comData: comData.length,
    escritas: linhas.filter((l) => l.escrita).length,
    calculadas: comData.filter((l) => !l.escrita).length,
    semData: linhas.filter((l) => l.data === null).length,
    pendentesDoEvento: linhas.filter((l) => l.motivoPendencia === "evento")
      .length,
    naFila: linhas.filter(
      (l) => l.motivoPendencia === "evento" || l.motivoPendencia === "pergunta",
    ).length,
    vencidas: linhas.filter(
      (l) => !l.cumpridaEm && l.dias !== null && l.dias < 0,
    ).length,
    nestaSemana: linhas.filter(
      (l) => !l.cumpridaEm && l.dias !== null && l.dias >= 0 && l.dias <= 7,
    ).length,
    cumpridas: linhas.filter((l) => l.cumpridaEm).length,
  };
}
