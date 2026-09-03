/**
 * As regras do produto (lib/data/regras.ts) sao puras de proposito: cada
 * regra de status e de limiar tem o teste que pegaria a regressao.
 */
import { describe, expect, it } from "vitest";

import {
  calculaStatusContrato,
  clausulaAtrasada,
  clausulasAlvoDaResposta,
  clausulaVenceEmBreve,
  confiancaDoContrato,
  contaObrigacoesComData,
  diasAte,
  geraItensIncerteza,
  proximoVencimento,
  revisadoPorDoContrato,
} from "@/lib/data/regras";
import { LIMIAR_INCERTEZA, type Clausula } from "@/lib/data/tipos";

const HOJE = "2026-08-30";

let seq = 0;
const clausula = (extra: Partial<Clausula> = {}): Clausula => ({
  id: `cl-${++seq}`,
  contratoId: "c-teste",
  tipo: "valor",
  textoOriginal: "Cláusula 4.1. Pagamento na forma ajustada.",
  resumoSimplificado: "Pagamento na forma ajustada",
  dataLimite: null,
  valorCentavos: null,
  responsavel: "contratante",
  status: "pendente",
  confianca: 0.95,
  revisadoPor: "ia",
  ...extra,
});

describe("diasAte", () => {
  it("conta dias civis, com atraso negativo", () => {
    expect(diasAte("2026-09-06", HOJE)).toBe(7);
    expect(diasAte(HOJE, HOJE)).toBe(0);
    expect(diasAte("2026-08-18", HOJE)).toBe(-12);
  });
});

describe("clausulaAtrasada e clausulaVenceEmBreve", () => {
  it("atrasada quando o prazo passou sem cumprimento", () => {
    expect(clausulaAtrasada(clausula({ dataLimite: "2026-08-29" }), HOJE)).toBe(true);
    expect(clausulaAtrasada(clausula({ dataLimite: "2026-08-31" }), HOJE)).toBe(false);
  });

  it("cumprida ou aceita nunca conta como atrasada", () => {
    expect(
      clausulaAtrasada(clausula({ dataLimite: "2026-08-01", status: "cumprida" }), HOJE),
    ).toBe(false);
    expect(
      clausulaAtrasada(clausula({ dataLimite: "2026-08-01", status: "aceita" }), HOJE),
    ).toBe(false);
  });

  it("vence em breve so dentro da janela de 7 dias, hoje incluso", () => {
    expect(clausulaVenceEmBreve(clausula({ dataLimite: HOJE }), HOJE)).toBe(true);
    expect(clausulaVenceEmBreve(clausula({ dataLimite: "2026-09-06" }), HOJE)).toBe(true);
    expect(clausulaVenceEmBreve(clausula({ dataLimite: "2026-09-07" }), HOJE)).toBe(false);
    expect(clausulaVenceEmBreve(clausula({ dataLimite: "2026-08-29" }), HOJE)).toBe(false);
  });
});

describe("calculaStatusContrato: a precedencia", () => {
  it("incerteza sobrepoe qualquer outro status", () => {
    const atrasadas = [clausula({ dataLimite: "2026-08-01" })];
    expect(calculaStatusContrato(atrasadas, 1, HOJE)).toBe("incerteza");
  });

  it("atrasado vence em_risco", () => {
    const cls = [
      clausula({ dataLimite: "2026-08-01" }),
      clausula({ dataLimite: "2026-09-02" }),
    ];
    expect(calculaStatusContrato(cls, 0, HOJE)).toBe("atrasado");
  });

  it("em_risco pela janela de 7 dias", () => {
    const cls = [clausula({ dataLimite: "2026-09-03" })];
    expect(calculaStatusContrato(cls, 0, HOJE)).toBe("em_risco");
  });

  it("em_risco pela multa so com obrigacao vencendo em ate 30 dias", () => {
    const cls = [
      clausula({ tipo: "multa", valorCentavos: 100000 }),
      clausula({ dataLimite: "2026-09-20" }),
    ];
    expect(calculaStatusContrato(cls, 0, HOJE)).toBe("em_risco");
  });

  it("multa com obrigacao distante nao poe o contrato em risco", () => {
    const cls = [
      clausula({ tipo: "multa", valorCentavos: 100000 }),
      clausula({ dataLimite: "2026-10-15" }),
    ];
    expect(calculaStatusContrato(cls, 0, HOJE)).toBe("pendente");
  });

  it("multa aceita nao poe o contrato em risco", () => {
    const cls = [
      clausula({ tipo: "multa", status: "aceita" }),
      clausula({ dataLimite: "2026-10-15" }),
    ];
    expect(calculaStatusContrato(cls, 0, HOJE)).toBe("pendente");
  });

  it("fechado quando tudo esta cumprido ou aceito", () => {
    const cls = [
      clausula({ status: "cumprida" }),
      clausula({ status: "aceita" }),
    ];
    expect(calculaStatusContrato(cls, 0, HOJE)).toBe("fechado");
  });

  it("recusada mantem o contrato em aberto", () => {
    const cls = [
      clausula({ status: "cumprida" }),
      clausula({ tipo: "reajuste", status: "recusada" }),
    ];
    expect(calculaStatusContrato(cls, 0, HOJE)).not.toBe("fechado");
  });

  it("sem clausulas e pendente, nao fechado", () => {
    expect(calculaStatusContrato([], 0, HOJE)).toBe("pendente");
  });
});

describe("geraItensIncerteza: o limiar", () => {
  it("abaixo do limiar vira item; no limiar, nao", () => {
    const baixa = clausula({ confianca: LIMIAR_INCERTEZA - 0.01 });
    const noLimiar = clausula({ confianca: LIMIAR_INCERTEZA });
    const itens = geraItensIncerteza([baixa, noLimiar]);
    expect(itens).toHaveLength(1);
    expect(itens[0].clausulaId).toBe(baixa.id);
    expect(itens[0].motivo).toBe("baixa_confianca");
  });

  it("clausula ja revisada por humano nao volta pra fila", () => {
    const revisada = clausula({ confianca: 0.5, revisadoPor: "humano" });
    expect(geraItensIncerteza([revisada])).toHaveLength(0);
  });

  it("clausula ja coberta por item aberto nao duplica", () => {
    const baixa = clausula({ confianca: 0.5 });
    const aberto = {
      id: "inc-x",
      contratoId: "c-teste",
      clausulaId: baixa.id,
      motivo: "clausula_ambigua" as const,
      trechoBruto: "",
      paginaPreviewUrl: null,
      interpretacaoSugerida: "",
      confianca: 0.5,
      assumidoPor: null,
    };
    expect(geraItensIncerteza([baixa], [aberto])).toHaveLength(0);
  });
});

describe("clausulasAlvoDaResposta: o que a resposta alcanca", () => {
  it("contato nao alcanca clausula nenhuma", () => {
    const cls = [clausula(), clausula({ dataLimite: "2026-08-18" })];
    expect(clausulasAlvoDaResposta(cls, "contato")).toHaveLength(0);
  });

  it("com clausula especifica, so ela", () => {
    const alvo = clausula();
    const cls = [alvo, clausula()];
    expect(clausulasAlvoDaResposta(cls, "aceite", alvo.id)).toEqual([alvo]);
  });

  it("aceite em massa cobre so o que foi apresentado como pendencia", () => {
    const pendencia = clausula();
    const cls = [
      pendencia,
      clausula({ tipo: "multa", valorCentavos: 250000 }),
      clausula({ tipo: "reajuste" }),
      clausula({ status: "cumprida" }),
      clausula({ status: "aceita" }),
    ];
    expect(clausulasAlvoDaResposta(cls, "aceite")).toEqual([pendencia]);
  });

  it("aceite em massa nao sobrepoe recusa anterior", () => {
    const recusada = clausula({ status: "recusada" });
    expect(clausulasAlvoDaResposta([recusada], "aceite")).toHaveLength(0);
  });
});

describe("proximoVencimento e confiancaDoContrato", () => {
  it("pega a data em aberto mais antiga, vencida inclusa", () => {
    const cls = [
      clausula({ dataLimite: "2026-09-10" }),
      clausula({ dataLimite: "2026-08-20" }),
      clausula({ dataLimite: "2026-08-01", status: "cumprida" }),
    ];
    expect(proximoVencimento(cls)).toBe("2026-08-20");
    expect(proximoVencimento([clausula()])).toBeNull();
  });

  it("a confianca do contrato e a menor entre os campos", () => {
    const cls = [clausula({ confianca: 0.9 }), clausula({ confianca: 0.61 })];
    expect(confiancaDoContrato(cls)).toBe(0.61);
    expect(confiancaDoContrato([])).toBe(1);
  });
});

describe("revisadoPorDoContrato: o selo do contrato", () => {
  it("humano so quando toda clausula foi revisada por gente", () => {
    const humanas = [
      clausula({ revisadoPor: "humano" }),
      clausula({ revisadoPor: "humano" }),
    ];
    expect(revisadoPorDoContrato(humanas)).toBe("humano");
  });

  it("uma clausula de ia basta pra manter o selo de ia", () => {
    const cls = [clausula({ revisadoPor: "humano" }), clausula()];
    expect(revisadoPorDoContrato(cls)).toBe("ia");
    expect(revisadoPorDoContrato([])).toBe("ia");
  });
});

describe("contaObrigacoesComData: o que vai pra agenda", () => {
  it("conta so o que esta em aberto E tem data", () => {
    expect(
      contaObrigacoesComData([
        clausula({ dataLimite: "2026-09-10" }),
        clausula({ dataLimite: "2026-10-01" }),
        // sem data nao vira evento
        clausula({ dataLimite: null }),
        // ja resolvida nao volta pro calendario de ninguem
        clausula({ dataLimite: "2026-09-15", status: "cumprida" }),
        clausula({ dataLimite: "2026-09-20", status: "aceita" }),
      ]),
    ).toBe(2);
  });

  it("recusada e atrasada seguem em aberto, entao contam", () => {
    expect(
      contaObrigacoesComData([
        clausula({ dataLimite: "2026-09-10", status: "recusada" }),
        clausula({ dataLimite: "2026-08-01", status: "atrasada" }),
      ]),
    ).toBe(2);
  });

  it("contrato sem clausula nao manda nada", () => {
    expect(contaObrigacoesComData([])).toBe(0);
  });
});
