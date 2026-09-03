/**
 * A demo cumpre o padrao que o extrator impoe ao modelo: toda citacao de
 * lib/demo/contratos.ts e conferida contra o texto real dos PDFs publicos
 * pelo proprio verificador do projeto (lib/extracao/verificador.ts).
 *
 * A tela vende "citacao literal entre aspas"; este teste e o que impede a
 * camada de demo de condensar ou parafrasear por conta propria.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

import { CONTRATO_ESTUDIO, CONTRATO_SHOW } from '@/lib/demo/contratos'
import { extraiPaginas } from '@/lib/extracao/pdf'
import { verificaCitacoes } from '@/lib/extracao/verificador'

const carrega = (pdf: string) =>
  extraiPaginas(
    new Uint8Array(readFileSync(join(process.cwd(), 'public', pdf))),
  )

describe('citacoes da demo contra os PDFs publicos', () => {
  for (const contrato of [CONTRATO_SHOW, CONTRATO_ESTUDIO]) {
    it(`${contrato.id}: 14 de 14 citacoes conferem na pagina apontada`, async () => {
      const paginas = await carrega(contrato.pdf)
      // o verificador zera a confianca no proprio objeto: confere numa copia
      const copia = structuredClone(contrato)
      const itens = verificaCitacoes(copia, paginas)
      const falhas = itens.filter((i) => !i.ok)
      expect(
        falhas.map((f) => `p.${f.pagina}: ${f.citacao.slice(0, 80)}`),
      ).toEqual([])
      expect(itens.length).toBe(14)
    })
  }
})
