/**
 * A trava mecanica contra alucinacao: toda citacao e conferida contra o
 * texto da pagina que o modelo apontou. Nao bate, a confianca vai a zero e
 * o campo nao entra no calendario: vai para a fila humana.
 *
 * A normalizacao existe por causa da licao dos contratos reais: o Word usa
 * espaco nao-quebravel (\xa0) no meio das frases, e sem normalizar toda
 * comparacao literal falha em silencio.
 */
import type { PaginaTexto } from "./pdf";

export type ItemVerificacao = {
  caminho: string;
  pagina: number;
  ok: boolean;
  citacao: string;
};

const normaliza = (s: string) =>
  s
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

type EvidenciaSolta = {
  citacao: string;
  pagina: number;
  confianca: number;
  [k: string]: unknown;
};

const pareceEvidencia = (v: unknown): v is EvidenciaSolta =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as EvidenciaSolta).citacao === "string" &&
  typeof (v as EvidenciaSolta).pagina === "number";

/**
 * Percorre o objeto extraido, confere cada evidencia e zera a confianca das
 * que nao baterem. Muta o proprio objeto (ja e uma copia do parse) e devolve
 * o relatorio.
 */
export function verificaCitacoes(
  raiz: unknown,
  paginas: PaginaTexto[],
): ItemVerificacao[] {
  const textoPorPagina = new Map(
    paginas.map((p) => [p.numero, normaliza(p.texto)]),
  );
  const itens: ItemVerificacao[] = [];

  const anda = (no: unknown, caminho: string) => {
    if (Array.isArray(no)) {
      no.forEach((filho, i) => anda(filho, `${caminho}[${i}]`));
      return;
    }
    if (typeof no !== "object" || no === null) return;

    if (pareceEvidencia(no)) {
      const alvo = textoPorPagina.get(no.pagina);
      const ok = Boolean(alvo && alvo.includes(normaliza(no.citacao)));
      if (!ok) no.confianca = 0;
      itens.push({ caminho, pagina: no.pagina, ok, citacao: no.citacao });
      return;
    }
    for (const [chave, valor] of Object.entries(no)) {
      anda(valor, caminho ? `${caminho}.${chave}` : chave);
    }
  };

  anda(raiz, "");
  return itens;
}
