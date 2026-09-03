"use server";

/**
 * O conteudo da notificacao da contraparte, montado uma vez e mostrado igual
 * nas tres telas (preview email, preview WhatsApp e pagina publica).
 *
 * A ordem e regra de produto: primeiro o que espera acao dela, priorizando o
 * que vence antes e o que tem multa; depois o que e so informacao. Linguagem
 * simples, sem juridiques; o texto original fica a um clique.
 */
import { agora, hojeISO } from "@/lib/clock";
import { clausulasAlvoDaResposta, diasAte } from "./regras";
import { clausulasDe, db, derivaContrato, proximoId } from "./store";
import type {
  AcaoContraparte,
  CanalNotificacao,
  Clausula,
  Contraparte,
  RespostaContraparte,
  StatusClausula,
  TipoClausula,
} from "./tipos";

/** Uma linha da analise tecnica: check, X ou atencao, no modelo do laudo. */
export type ItemAnalise = {
  clausulaId: string;
  estado: "ok" | "falha" | "atencao";
  rotulo: string;
  detalhe: string;
};

export type ItemNotificacao = {
  clausulaId: string;
  tipo: TipoClausula;
  resumo: string;
  textoOriginal: string;
  dataLimite: string | null;
  dias: number | null;
  valorCentavos: number | null;
  status: StatusClausula;
  temMultaAssociada: boolean;
};

export type Notificacao = {
  contratoId: string;
  tokenPublico: string;
  titulo: string;
  contraparte: Contraparte;
  canalPreferencial: CanalNotificacao;
  remetente: string;
  assunto: string;
  hoje: string;
  /** Espera acao da contraparte, na ordem de urgencia. */
  pendencias: ItemNotificacao[];
  /** Nao espera acao, mas ela precisa saber: reajustes, multas, renovacoes. */
  avisos: ItemNotificacao[];
  /** O que ja foi cumprido ou aceito: fecha o quadro completo do contrato. */
  resolvidas: ItemNotificacao[];
  /** O laudo no modelo da referencia: analise, riscos e recomendacoes. */
  analise: ItemAnalise[];
  riscos: string[];
  recomendacoes: string[];
  totalPendenteCentavos: number;
  respostas: RespostaContraparte[];
};

const emAberto = (c: Clausula) =>
  c.status !== "cumprida" && c.status !== "aceita";

function montaItem(
  c: Clausula,
  hoje: string,
  temMulta: boolean,
): ItemNotificacao {
  return {
    clausulaId: c.id,
    tipo: c.tipo,
    resumo: c.resumoSimplificado,
    textoOriginal: c.textoOriginal,
    dataLimite: c.dataLimite,
    dias: c.dataLimite ? diasAte(c.dataLimite, hoje) : null,
    valorCentavos: c.valorCentavos,
    status: c.status,
    temMultaAssociada: temMulta,
  };
}

export async function montaNotificacao(
  contratoId: string,
): Promise<Notificacao | null> {
  const s = db();
  const hoje = hojeISO(await agora());
  const contrato = derivaContrato(s, contratoId, hoje);
  if (!contrato) return null;

  const clausulas = clausulasDe(s, contratoId);
  const temMulta = clausulas.some((c) => c.tipo === "multa" && emAberto(c));

  // Pendencia: TODA obrigacao em aberto, com ou sem prazo definido. Multa em
  // aberto sem data nao e tarefa, e consequencia: vira aviso.
  const pendencias = clausulas
    .filter((c) => emAberto(c) && c.tipo !== "multa" && c.tipo !== "reajuste")
    .map((c) => montaItem(c, hoje, temMulta))
    .sort((a, b) => {
      if (a.dias !== null && b.dias !== null && a.dias !== b.dias)
        return a.dias - b.dias;
      if ((a.dias === null) !== (b.dias === null)) return a.dias === null ? 1 : -1;
      return (b.valorCentavos ?? 0) - (a.valorCentavos ?? 0);
    });

  const avisos = clausulas
    .filter((c) => (c.tipo === "multa" || c.tipo === "reajuste") && c.status !== "cumprida")
    .map((c) => montaItem(c, hoje, temMulta));

  const resolvidas = clausulas
    .filter((c) => c.status === "cumprida" || (c.status === "aceita" && c.tipo !== "multa" && c.tipo !== "reajuste"))
    .map((c) => montaItem(c, hoje, false))
    .sort((a, b) => (a.dataLimite ?? "9999").localeCompare(b.dataLimite ?? "9999"));

  // O laudo no modelo da referencia: cada clausula vira uma linha de check,
  // e riscos e recomendacoes saem das mesmas regras, nunca de texto livre.
  const fmtData = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const fmtValor = (centavos: number) =>
    `R$ ${(centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const analise: ItemAnalise[] = clausulas.map((c) => {
    const dias = c.dataLimite ? diasAte(c.dataLimite, hoje) : null;
    const valor = c.valorCentavos ? `, ${fmtValor(c.valorCentavos)}` : "";
    if (c.status === "cumprida")
      return { clausulaId: c.id, estado: "ok", rotulo: c.resumoSimplificado, detalhe: `cumprida${valor}` };
    if (c.status === "aceita")
      return { clausulaId: c.id, estado: "ok", rotulo: c.resumoSimplificado, detalhe: `aceita por você${valor}` };
    if (c.status === "recusada")
      return { clausulaId: c.id, estado: "falha", rotulo: c.resumoSimplificado, detalhe: `você recusou, em renegociação${valor}` };
    if (dias !== null && dias < 0)
      return { clausulaId: c.id, estado: "falha", rotulo: c.resumoSimplificado, detalhe: `venceu há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"} (${fmtData(c.dataLimite!)})${valor}` };
    if (c.tipo === "multa")
      return { clausulaId: c.id, estado: "atencao", rotulo: c.resumoSimplificado, detalhe: `prevista no contrato${valor}` };
    if (dias !== null && dias <= 7)
      return { clausulaId: c.id, estado: "atencao", rotulo: c.resumoSimplificado, detalhe: `vence ${dias === 0 ? "hoje" : `em ${dias} ${dias === 1 ? "dia" : "dias"}`} (${fmtData(c.dataLimite!)})${valor}` };
    if (!c.dataLimite)
      return { clausulaId: c.id, estado: "falha", rotulo: c.resumoSimplificado, detalhe: "sem data definida no contrato" };
    return { clausulaId: c.id, estado: "ok", rotulo: c.resumoSimplificado, detalhe: `no prazo, até ${fmtData(c.dataLimite)}${valor}` };
  });

  const abertas = clausulas.filter(emAberto);
  const vencidasCls = abertas.filter(
    (c) => c.dataLimite && diasAte(c.dataLimite, hoje) < 0,
  );
  const semData = abertas.filter(
    (c) => !c.dataLimite && c.tipo !== "multa" && c.tipo !== "reajuste",
  );
  const multaAberta = clausulas.find((c) => c.tipo === "multa" && emAberto(c));
  const recusadas = clausulas.filter((c) => c.status === "recusada");

  const riscos: string[] = [
    ...vencidasCls.map(
      (c) => `${c.resumoSimplificado} já venceu e pode acumular mora`,
    ),
    ...(multaAberta
      ? [
          `Multa prevista${multaAberta.valorCentavos ? ` de ${fmtValor(multaAberta.valorCentavos)}` : ""} em caso de cancelamento ou atraso`,
        ]
      : []),
    ...recusadas.map(
      (c) => `${c.resumoSimplificado} está em disputa até a renegociação`,
    ),
    ...semData.map(
      (c) => `${c.resumoSimplificado} sem data definida: a cobrança fica no ar`,
    ),
  ];

  const aVencer = abertas
    .filter((c) => c.dataLimite && diasAte(c.dataLimite, hoje) >= 0)
    .sort((a, b) => a.dataLimite!.localeCompare(b.dataLimite!));
  const recomendacoes: string[] = [
    ...vencidasCls.map(
      (c) =>
        `Regularizar ${c.resumoSimplificado.toLowerCase()}${c.valorCentavos ? ` (${fmtValor(c.valorCentavos)})` : ""} o quanto antes`,
    ),
    ...aVencer
      .slice(0, 2)
      .map(
        (c) =>
          `Programar ${c.resumoSimplificado.toLowerCase()} até ${fmtData(c.dataLimite!)}`,
      ),
    ...semData.map(
      (c) => `Definir com a gente a data de ${c.resumoSimplificado.toLowerCase()}`,
    ),
    ...(recusadas.length > 0
      ? ["Responder a proposta de renegociação pelo botão abaixo"]
      : []),
  ];

  const vencidas = pendencias.filter((p) => p.dias !== null && p.dias < 0);
  const assunto =
    vencidas.length > 0
      ? `Você tem ${
          vencidas.length === 1
            ? "1 pendência vencida"
            : `${vencidas.length} pendências vencidas`
        } no contrato "${contrato.titulo}"`
      : pendencias.length > 0
        ? `Prazos e valores do contrato "${contrato.titulo}"`
        : `Tudo em dia no contrato "${contrato.titulo}"`;

  return {
    contratoId: contrato.id,
    tokenPublico: contrato.tokenPublico,
    titulo: contrato.titulo,
    contraparte: contrato.contraparte,
    canalPreferencial: contrato.contraparte.canalPreferencial,
    remetente: "Revelio",
    assunto,
    hoje,
    pendencias,
    avisos,
    resolvidas,
    analise,
    riscos,
    recomendacoes,
    totalPendenteCentavos: pendencias.reduce(
      (soma, p) => soma + (p.valorCentavos ?? 0),
      0,
    ),
    respostas: s.respostas.filter((r) => r.contratoId === contratoId),
  };
}

export async function montaNotificacaoPorToken(
  token: string,
): Promise<Notificacao | null> {
  const s = db();
  const contrato = s.contratos.find((c) => c.tokenPublico === token);
  return contrato ? montaNotificacao(contrato.id) : null;
}

export async function registraResposta(entrada: {
  tokenPublico: string;
  clausulaId?: string | null;
  acao: AcaoContraparte;
  justificativa?: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const s = db();
  const contrato = s.contratos.find(
    (c) => c.tokenPublico === entrada.tokenPublico,
  );
  if (!contrato) return { ok: false, erro: "Contrato não encontrado." };

  const justificativa = entrada.justificativa?.trim() || null;
  if (entrada.acao !== "aceite" && !justificativa) {
    return { ok: false, erro: "Conte o motivo pra gente encaminhar certo." };
  }

  const hoje = hojeISO(await agora());
  const quando = (await agora()).toISOString();

  s.respostas.push({
    id: proximoId(s, "resp"),
    contratoId: contrato.id,
    clausulaId: entrada.clausulaId ?? null,
    acao: entrada.acao,
    justificativa,
    quando,
  });

  // A resposta muda a clausula: aceite fecha, recusa marca, contato nao mexe
  // em status. O alvo e regra pura: exatamente as pendencias apresentadas.
  const alvo = clausulasAlvoDaResposta(
    s.clausulas.filter((c) => c.contratoId === contrato.id),
    entrada.acao,
    entrada.clausulaId,
  );
  for (const c of alvo) {
    c.status = entrada.acao === "aceite" ? "aceita" : "recusada";
  }

  const rotulos: Record<AcaoContraparte, string> = {
    aceite: "aceitou os termos notificados",
    nao_aceite: "não aceitou os termos notificados",
    contato: "pediu contato humano",
  };
  s.eventos.push({
    id: proximoId(s, "ev"),
    contratoId: contrato.id,
    tipo: "resposta_contraparte",
    quando,
    descricao: `${contrato.contraparte.nome} ${rotulos[entrada.acao]}${
      justificativa ? `: "${justificativa}"` : ""
    }`,
    autor: "contraparte",
  });

  derivaContrato(s, contrato.id, hoje);
  return { ok: true };
}
