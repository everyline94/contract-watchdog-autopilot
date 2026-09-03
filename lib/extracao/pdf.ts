/**
 * Texto do PDF, pagina a pagina, no servidor.
 *
 * So texto: nada de OCR (contrato escaneado esta fora do MVP). A pagina e a
 * unidade porque toda evidencia cita pagina, e o verificador confere a
 * citacao contra o texto DELA.
 */
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export type PaginaTexto = { numero: number; texto: string };

export type ItemTexto = {
  str: string;
  hasEOL?: boolean;
  /** Matriz do pdfjs: transform[4] e x, transform[5] e y (origem embaixo). */
  transform: number[];
};

/**
 * Ordena por posicao na pagina: y de cima pra baixo, depois x da esquerda
 * pra direita. Licao do terceiro contrato da demo: PDF montado,
 * assinado ou anonimizado tem blocos fora da ordem de leitura, e confiar na
 * ordem do arquivo embaralha o texto que alimenta prompt e verificador.
 */
export function ordenaItens<T extends ItemTexto>(itens: T[]): T[] {
  const TOLERANCIA_LINHA = 2;
  return [...itens].sort((a, b) => {
    const dy = b.transform[5] - a.transform[5];
    if (Math.abs(dy) > TOLERANCIA_LINHA) return dy;
    return a.transform[4] - b.transform[4];
  });
}

export async function extraiPaginas(dados: Uint8Array): Promise<PaginaTexto[]> {
  const tarefa = getDocument({ data: dados, disableFontFace: true });
  const doc = await tarefa.promise;

  try {
    const paginas: PaginaTexto[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const pagina = await doc.getPage(n);
      const conteudo = await pagina.getTextContent();
      const itens = conteudo.items.filter(
        (item): item is ItemTexto & typeof item => "str" in item,
      );
      const texto = ordenaItens(itens)
        .map((item) => item.str + (item.hasEOL ? "\n" : ""))
        .join(" ");
      paginas.push({ numero: n, texto });
    }
    return paginas;
  } finally {
    // uma pagina corrompida no meio nao pode vazar o documento aberto
    await tarefa.destroy();
  }
}
