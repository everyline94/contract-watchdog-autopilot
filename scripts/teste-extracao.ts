/**
 * Teste do pipeline de leitura, sem UI:
 *   npx tsx scripts/teste-extracao.ts public/contratos/contrato-videos-estudio.pdf
 */
import { readFileSync } from "node:fs";

import { extraiContrato } from "@/lib/extracao/extrator";
import { paraLinhas } from "@/lib/extracao/para-linhas";
import { extraiPaginas } from "@/lib/extracao/pdf";
import { verificaCitacoes } from "@/lib/extracao/verificador";

async function main() {
  const caminho = process.argv[2];
  if (!caminho) throw new Error("uso: teste-extracao.ts <pdf>");
  const inicio = Date.now();

  const paginas = await extraiPaginas(new Uint8Array(readFileSync(caminho)));
  console.log(`paginas: ${paginas.length}`);

  const { contrato, motor } = await extraiContrato(paginas);
  console.log(`motor: ${motor}, ${Math.round((Date.now() - inicio) / 1000)}s`);

  const itens = verificaCitacoes(contrato, paginas);
  const ok = itens.filter((i) => i.ok).length;
  console.log(`citacoes: ${ok}/${itens.length} conferidas`);
  for (const i of itens.filter((x) => !x.ok).slice(0, 6)) {
    console.log(`  REPROVADA ${i.caminho} (p${i.pagina}): ${i.citacao.slice(0, 60)}`);
  }

  const leitura = paraLinhas(contrato, "2026-08-29");
  console.log(`\nlinhas (${leitura.linhas.length}):`);
  for (const l of leitura.linhas) {
    console.log(
      `  ${l.data ?? "sem data   "}  ${l.titulo.slice(0, 58)}${l.valor ? `  R$ ${l.valor}` : ""}${l.divergencia ? "  [DIVERGE]" : ""}`,
    );
  }
  console.log(`\nfila (${leitura.fila.length}):`);
  for (const f of leitura.fila) console.log(`  ${f.sobre}: ${f.pergunta.slice(0, 80)}`);
  console.log(`\ncabecalho:`, JSON.stringify(leitura.cabecalho, null, 1).slice(0, 600));
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
