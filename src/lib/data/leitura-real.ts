/**
 * A ponte entre o motor de leitura e o vocabulario do produto.
 *
 * O `/ler` mostra a saida crua do extrator: linha de calendario, citacao,
 * pagina. O `/app` fala outra lingua, a de `Clausula`: tipo, resumo, texto
 * original, data limite, valor em centavos, confianca. Este arquivo traduz um
 * no outro, e e o unico lugar que conhece as duas.
 *
 * Antes daqui a fila de upload nao lia nada: avancava por tempo e devolvia
 * seis clausulas fixas, iguais para qualquer PDF.
 */
import { extraiContrato } from "@/lib/extracao/extrator";
import { paraLinhas, type Leitura } from "@/lib/extracao/para-linhas";
import { extraiPaginas } from "@/lib/extracao/pdf";
import { verificaCitacoes } from "@/lib/extracao/verificador";
import type { Linha } from "@/lib/demo/resolve";
import type { Clausula, TipoClausula } from "./tipos";

export type ClausulaLida = Omit<Clausula, "id" | "contratoId">;

/**
 * Erro com mensagem de produto: a fila mostra isso no card do item, entao
 * cada texto termina na proxima acao de quem subiu o arquivo.
 */
export class ErroLeitura extends Error {}

/**
 * Confianca a partir do que o motor conseguiu resolver.
 *
 * A citacao de toda linha ja passou pelo verificador: o que nao conferiu foi
 * descartado antes de chegar aqui. Entao o que separa alta de baixa nao e
 * mais a citacao, e sim se a data fechou. Linha pendente vira item da fila de
 * incerteza (o limiar do produto e 0,75), que e exatamente onde ela deve
 * estar: falta uma resposta humana para virar prazo.
 */
const confiancaDe = (l: Linha): number => {
  if (l.data) return l.escrita ? 0.97 : 0.92;
  return l.motivoPendencia === "estrutural" ? 0.8 : 0.5;
};

/** O tipo do produto a partir do id que o motor deu para a linha. */
const tipoDe = (l: Linha): TipoClausula => {
  if (l.id.startsWith("cancelamento")) return "multa";
  if (l.id.startsWith("parcela")) return "valor";
  if (l.id.startsWith("evento")) return "prazo";
  if (l.valor !== undefined) return "valor";
  return "obrigacao";
};

/**
 * O texto original e a citacao literal, com a cláusula e a pagina de onde
 * saiu. A ficha do contrato mostra este campo como prova, entao ele nao pode
 * virar parafrase: e o mesmo compromisso que o `/ler` faz na tela.
 */
const textoDe = (l: Linha): string => {
  const citacao = l.evidencia?.citacao?.trim();
  if (!citacao) return l.titulo;
  const rotulo = l.evidencia?.rotulo;
  return rotulo ? `${citacao}\n\n(${rotulo})` : citacao;
};

/** Converte o resultado do motor nas clausulas que o produto entende. */
export function paraClausulas(leitura: Leitura): ClausulaLida[] {
  const clausulas: ClausulaLida[] = leitura.linhas.map((l) => ({
    tipo: tipoDe(l),
    textoOriginal: textoDe(l),
    resumoSimplificado: l.titulo,
    dataLimite: l.data,
    valorCentavos: l.valor !== undefined ? Math.round(l.valor * 100) : null,
    responsavel: "contratante",
    status: "pendente",
    confianca: confiancaDe(l),
    revisadoPor: "ia",
  }));

  // As perguntas da fila humana que nenhuma linha ja representa. Sem isto, o
  // que o verificador derrubou (valor total, efeito de rescisao) sumiria de
  // novo, so que agora dentro do produto.
  const titulos = new Set(leitura.linhas.map((l) => l.titulo));
  for (const p of leitura.fila) {
    const alvo = p.sobre.replace(/^Prazo: /, "");
    if (titulos.has(alvo)) continue;
    clausulas.push({
      tipo: "obrigacao",
      textoOriginal: p.pergunta,
      resumoSimplificado: p.sobre,
      dataLimite: null,
      valorCentavos: null,
      responsavel: "contratante",
      status: "pendente",
      confianca: 0.4,
      revisadoPor: "ia",
    });
  }

  return clausulas;
}

/**
 * Le o PDF de verdade: paginas, modelo, verificador de citacao e motor de
 * datas, a mesma sequencia do `/ler`. Erro sai como ErroLeitura, com o texto
 * que a fila mostra no card.
 */
export async function leContrato(
  bytes: Uint8Array,
  hoje: string,
): Promise<ClausulaLida[]> {
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new ErroLeitura(
      "O arquivo não é um PDF. Exporte o contrato como PDF (imprimir para PDF resolve a maioria) e suba de novo.",
    );
  }

  let paginas;
  try {
    paginas = await extraiPaginas(bytes);
  } catch {
    throw new ErroLeitura(
      "Não conseguimos abrir este PDF. Ele parece corrompido ou incompleto; exporte de novo e suba outra vez.",
    );
  }

  if (paginas.every((p) => p.texto.trim().length < 40)) {
    throw new ErroLeitura(
      "Este PDF não tem texto extraível, provavelmente é escaneado. Contrato escaneado está fora do escopo: peça o PDF original à contraparte.",
    );
  }

  const { contrato } = await extraiContrato(paginas);
  verificaCitacoes(contrato, paginas);
  return paraClausulas(paraLinhas(contrato, hoje));
}
