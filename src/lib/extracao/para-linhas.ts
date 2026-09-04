/**
 * Da extracao para a tela: o que o modelo leu vira linhas de calendario
 * passando pelo motor puro. Campo sem confianca ou sem valor nao entra no
 * calendario: vira pergunta na fila humana.
 */
import { differenceInCalendarDays } from "date-fns";

import type { Linha } from "@/lib/demo/resolve";
import { feriadosPadrao } from "@/lib/feriados";
import {
  auditaCoerencia,
  deISO,
  resolvePrazo,
  type Ancoras,
} from "@/lib/motor-datas";
import type { ContratoExtraido, Evidencia } from "@/lib/types";
import { paraISOData } from "./datas";

const FERIADOS = feriadosPadrao();

/**
 * Corte de confianca prometido em canvas e docs: campo abaixo de 0,85 nao
 * vira prazo, vira pergunta. Antes o corte era "maior que zero", e um campo
 * com confianca 0,01 podia entrar no calendario financeiro.
 */
export const CONFIANCA_MINIMA = 0.85;

export type Pergunta = { sobre: string; pergunta: string };

export type Leitura = {
  linhas: Linha[];
  fila: Pergunta[];
  cabecalho: {
    tipo: string;
    partes: { papel: string; nome: string }[];
    total: number | null;
    desconto: number | null;
    contadores: { descricao: string; resumo: string }[];
  };
};

type Campo<T> = {
  valor: T | null;
  motivo: string | null;
  detalhe_pendencia: string | null;
  evidencia: Evidencia | null;
};

const confiavel = <T,>(c: Campo<T> | null | undefined): c is Campo<T> & { valor: T } =>
  Boolean(
    c && c.valor !== null && (c.evidencia?.confianca ?? 0) >= CONFIANCA_MINIMA,
  );

const rotuloDe = (ev: Evidencia | null): string => {
  if (!ev) return "sem evidência";
  const partes = [
    ev.clausula ?? "cláusula não identificada",
    ev.item ? `item ${ev.item}` : null,
    `página ${ev.pagina}`,
  ].filter(Boolean);
  return partes.join(", ");
};

const evidenciaDemo = (ev: Evidencia | null) => ({
  rotulo: rotuloDe(ev),
  pagina: ev?.pagina ?? 0,
  citacao: ev?.citacao ?? "o campo não trouxe citação",
});

/** A pendencia diz de qual ancora depende, nao chapa "data do evento". */
const NOME_ANCORA: Record<string, string> = {
  evento: "da data do evento",
  evento_secundario: "da data do evento secundário (ensaio, prova)",
  assinatura: "da data de assinatura",
  parcela: "da data da parcela",
  entrega: "da data de entrega efetiva",
  uso: "da data de uso",
};
const dependeDe = (ancora: string) =>
  `Depende ${NOME_ANCORA[ancora] ?? `da âncora "${ancora}"`}, que ainda não se conhece`;

export function paraLinhas(c: ContratoExtraido, hoje: string): Leitura {
  const linhas: Linha[] = [];
  const fila: Pergunta[] = [];

  const perguntaDe = <T,>(sobre: string, campo: Campo<T> | null | undefined) => {
    if (!campo) return;
    const confianca = campo.evidencia?.confianca ?? 0;
    if (campo.valor !== null && confianca < CONFIANCA_MINIMA) {
      fila.push({
        sobre,
        pergunta: campo.evidencia
          ? confianca === 0
            ? "A citação informada não confere com o texto da página: o valor foi descartado. Confirme no documento."
            : "O modelo leu este campo com confiança abaixo do corte de 0,85: o valor não entra no calendário sozinho. Confirme no documento."
          : "O campo veio sem citação de origem: o valor foi descartado. Confirme no documento.",
      });
      return;
    }
    if (campo.valor === null && campo.motivo) {
      fila.push({
        sobre,
        pergunta:
          campo.detalhe_pendencia ??
          `Informação ${campo.motivo === "ausente" ? "ausente no documento" : campo.motivo}. Informe para calcular.`,
      });
    }
  };

  const dias = (iso: string) =>
    differenceInCalendarDays(deISO(iso), deISO(hoje));

  // ancoras
  const eventoISO = confiavel(c.evento.data)
    ? paraISOData(c.evento.data.valor)
    : null;
  const entradaCampo = c.parcelas.find((p) => p.ordem === 1)?.data_escrita;
  const entradaISO = confiavel(entradaCampo ?? null)
    ? paraISOData(entradaCampo!.valor)
    : null;
  const ancoras: Ancoras = {
    evento: eventoISO,
    // A ancora de topo importa: o motor so consulta `nomeadas` quando ha
    // ancora_ref. Uma regra {ancora: "parcela", ancora_ref: null} resolve
    // por aqui, senao vira pendencia mesmo com a entrada conhecida.
    parcela: entradaISO,
    nomeadas: entradaISO ? { entrada: entradaISO, parcela: entradaISO } : {},
  };

  // o evento
  if (eventoISO) {
    linhas.push({
      id: "evento",
      titulo: "O evento",
      data: eventoISO,
      dias: dias(eventoISO),
      escrita: true,
      origem: "escrita no contrato",
      evidencia: evidenciaDemo(c.evento.data.evidencia),
    });
  } else {
    linhas.push({
      id: "evento",
      titulo: "O evento",
      data: null,
      dias: null,
      escrita: false,
      pendencia:
        c.evento.data.detalhe_pendencia ??
        "A data do evento não consta no documento",
      motivoPendencia: "evento",
      evidencia: evidenciaDemo(c.evento.data.evidencia),
    });
  }
  perguntaDe("Data do evento", c.evento.data);

  // parcelas
  c.parcelas.forEach((p, i) => {
    const rotulo = confiavel(p.percentual)
      ? `Parcela ${p.ordem} (${p.percentual.valor}%)`
      : `Parcela ${p.ordem}`;
    const escritaISO = confiavel(p.data_escrita)
      ? paraISOData(p.data_escrita.valor)
      : null;
    const regra = confiavel(p.prazo_relativo) ? p.prazo_relativo.valor : null;

    let resolvida: string | null = null;
    let crua: string | null = null;
    let pendencia: string | undefined;
    if (regra) {
      const r = resolvePrazo(regra, ancoras, FERIADOS);
      const rCrua = resolvePrazo(regra, ancoras, FERIADOS, {
        ajustarBorda: false,
      });
      resolvida = r.data;
      crua = rCrua.data;
      if (r.pendencia) {
        pendencia = dependeDe(r.pendencia.depende_de);
      }
    }

    const vigente = escritaISO ?? resolvida;
    const evidencia = evidenciaDemo(
      p.data_escrita.evidencia ?? p.prazo_relativo.evidencia ?? p.valor.evidencia,
    );

    linhas.push({
      id: `parcela-${i}`,
      titulo: rotulo,
      valor: confiavel(p.valor) ? p.valor.valor : undefined,
      cobravel: true,
      data: vigente,
      dias: vigente ? dias(vigente) : null,
      escrita: Boolean(escritaISO),
      origem: escritaISO
        ? "escrita no contrato"
        : regra
          ? `calculada: ${descreveRegra(regra)}`
          : undefined,
      pendencia: vigente ? undefined : (pendencia ?? "Sem data e sem regra no documento"),
      divergencia: auditaCoerencia(crua, escritaISO) ?? undefined,
      evidencia,
    });
    perguntaDe(`${rotulo}: valor`, p.valor);
    if (!escritaISO && !regra) perguntaDe(`${rotulo}: vencimento`, p.data_escrita);
  });

  // obrigacoes com prazo
  c.obrigacoes_prazo.forEach((o, i) => {
    const regra = confiavel(o.prazo) ? o.prazo.valor : null;
    let data: string | null = null;
    let pendencia: string | undefined;
    if (regra) {
      const r = resolvePrazo(regra, ancoras, FERIADOS);
      data = r.data;
      if (r.pendencia) pendencia = dependeDe(r.pendencia.depende_de);
    } else {
      pendencia =
        o.prazo.detalhe_pendencia ?? "O documento não dá uma regra de prazo";
    }
    linhas.push({
      id: `obrigacao-${i}`,
      titulo: o.descricao,
      detalhe:
        o.devedor === "terceiro"
          ? `Devido por terceiro${o.devedor_detalhe ? `: ${o.devedor_detalhe}` : ""}. O alerta vai para quem tem que cobrar.`
          : undefined,
      data,
      dias: data ? dias(data) : null,
      escrita: false,
      origem: regra ? `calculada: ${descreveRegra(regra)}` : undefined,
      condicao: regra?.condicao ?? undefined,
      pendencia: data ? undefined : pendencia,
      motivoPendencia: data
        ? undefined
        : regra
          ? "evento"
          : "pergunta",
      evidencia: evidenciaDemo(o.prazo.evidencia),
    });
    if (!regra) perguntaDe(`Prazo: ${o.descricao}`, o.prazo);
  });

  // fronteiras de cancelamento
  const total = confiavel(c.valores.total) ? c.valores.total.valor : null;
  const desconto = confiavel(c.valores.desconto) ? c.valores.desconto.valor : null;
  const base = total !== null ? total - (desconto ?? 0) : null;
  c.cancelamento.forEach((f, i) => {
    const regra = confiavel(f.limite_inferior) ? f.limite_inferior.valor : null;
    if (!regra) return;
    const r = resolvePrazo(regra, ancoras, FERIADOS);
    const pct = confiavel(f.percentual_devido) ? f.percentual_devido.valor : null;
    linhas.push({
      id: `cancelamento-${i}`,
      titulo: pct !== null
        ? `Fronteira de cancelamento: ${pct}% devido`
        : "Fronteira de cancelamento",
      valor:
        pct !== null && base !== null
          ? Math.round(base * pct) / 100
          : undefined,
      data: r.data,
      dias: r.data ? dias(r.data) : null,
      escrita: false,
      origem: `calculada: ${descreveRegra(regra)}`,
      pendencia: r.data
        ? undefined
        : dependeDe(r.pendencia?.depende_de ?? "evento"),
      motivoPendencia: r.data ? undefined : "evento",
      evidencia: evidenciaDemo(f.limite_inferior.evidencia),
    });
  });

  linhas.sort((a, b) => (a.data ?? "9999").localeCompare(b.data ?? "9999"));

  const contadores = c.contadores.map((ct) => ({
    descricao: ct.descricao,
    resumo: [
      confiavel(ct.limite_incluso)
        ? `${ct.limite_incluso.valor} ${ct.unidade} inclusas (${ct.escopo})`
        : ct.escopo,
      confiavel(ct.valor_excedente)
        ? `excedente a R$ ${ct.valor_excedente.valor.toFixed(2)}`
        : null,
    ]
      .filter(Boolean)
      .join(", "),
  }));

  return {
    linhas,
    fila,
    cabecalho: {
      tipo: c.tipo,
      partes: c.partes.map((p) => ({ papel: p.papel, nome: p.nome })),
      total,
      desconto,
      contadores,
    },
  };
}

function descreveRegra(r: {
  quantidade: number;
  unidade: string;
  sentido: string;
  ancora: string;
  base?: string;
}): string {
  const unidade =
    r.quantidade === 1 ? r.unidade.replace(/s$/, "") : r.unidade;
  const ancora = r.ancora === "parcela" ? "da parcela" : `do ${r.ancora}`;
  const uteis = r.base === "uteis" ? " úteis" : "";
  return `${r.quantidade} ${unidade}${uteis} ${r.sentido} ${ancora}`;
}
