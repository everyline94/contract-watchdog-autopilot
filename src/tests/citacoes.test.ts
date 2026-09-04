/**
 * A demo cumpre o padrao que o extrator impoe ao modelo: toda citacao de
 * src/lib/demo/contratos.ts e conferida contra o texto real dos PDFs publicos
 * pelo proprio verificador do projeto (src/lib/extracao/verificador.ts).
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

/**
 * A licao dos dois contratos reais de setembro: pdf.ts junta os itens do
 * pdfjs com " ", e o Word quebrando a frase em runs injeta espaco onde o
 * documento nao tem. A pagina chega como "R$ 2.990 , 00", o modelo cita o
 * trecho limpo, e a comparacao literal reprovava citacao certa. Custou o
 * valor total de um dos contratos, descartado sem aviso.
 */
describe('espacamento espurio do pdfjs nao reprova citacao correta', () => {
  const pagina = [
    {
      numero: 1,
      texto:
        'CLÁUSULA TERCEIRA Fica pactuado o valor de R$ 2.990 , 00 (dois mil, novecentos e noventa reais) . Caso a desistência ocorra por parte do CONTRATADO , ele deverá devolver o valor.',
    },
  ]

  const confere = (citacao: string) => {
    const raiz = { campo: { citacao, pagina: 1, confianca: 0.9 } }
    const itens = verificaCitacoes(raiz, pagina)
    return { ok: itens[0].ok, confianca: raiz.campo.confianca }
  }

  it('confere a citacao sem os espacos que o pdfjs injetou', () => {
    const r = confere('Fica pactuado o valor de R$ 2.990,00 (dois mil, novecentos e noventa reais).')
    expect(r.ok).toBe(true)
    expect(r.confianca).toBe(0.9)
  })

  it('confere mesmo com espaco antes da virgula no meio da frase', () => {
    expect(confere('Caso a desistência ocorra por parte do CONTRATADO, ele deverá').ok).toBe(true)
  })

  it('citacao que nao esta na pagina continua reprovando e zera a confianca', () => {
    const raiz = { campo: { citacao: 'o valor será devolvido em dobro', pagina: 1, confianca: 0.9 } }
    const itens = verificaCitacoes(raiz, pagina)
    expect(itens[0].ok).toBe(false)
    expect(raiz.campo.confianca).toBe(0)
  })

  it('citacao vazia reprova: sem a guarda, includes("") aprovaria qualquer coisa', () => {
    expect(confere('   ').ok).toBe(false)
  })

  it('pagina que o modelo apontou errado continua reprovando', () => {
    const raiz = { campo: { citacao: 'Fica pactuado o valor', pagina: 7, confianca: 0.9 } }
    expect(verificaCitacoes(raiz, pagina)[0].ok).toBe(false)
  })
})
