/**
 * Testes do cumprimento de obrigacao na camada de demo. Os numeros vem do
 * CONTRATO_SHOW (contrato A): entrada de R$ 2.490 vencida em 14/08/2026,
 * saldo de R$ 5.810 vencido em 08/12/2026, mora de 2% + 1% a.m. pro rata die.
 */
import { describe, it, expect } from 'vitest'
import { CONTRATO_SHOW } from '@/lib/demo/contratos'
import { montaEmail } from '@/lib/demo/monitor'
import { contagens, resolveContrato } from '@/lib/demo/resolve'
import { comFeito, hrefDemo, leEstado, semFeito } from '@/lib/demo/url'
import { calculaMora } from '@/lib/motor-datas'

// 09/12/2026: um dia depois do vencimento do saldo, entrada ha muito vencida
const HOJE = '2026-12-09'

describe('cumprimento de obrigacao', () => {
  it('obrigacao cumprida sai da cobranca do dia', () => {
    const linhas = resolveContrato(CONTRATO_SHOW, HOJE, null, {
      'show-saldo': HOJE,
    })
    const email = montaEmail(CONTRATO_SHOW, linhas, HOJE)
    const ids = email!.cobrancas.map((c) => c.linha.id)
    expect(ids).toContain('show-entrada')
    expect(ids).not.toContain('show-saldo')
  })

  it('quitar todas as parcelas apaga o e-mail do monitor', () => {
    const linhas = resolveContrato(CONTRATO_SHOW, HOJE, null, {
      'show-entrada': HOJE,
      'show-saldo': HOJE,
    })
    expect(montaEmail(CONTRATO_SHOW, linhas, HOJE)).toBeNull()
  })

  it('mora congela na data do cumprimento, nao no hoje', () => {
    // pago em 09/12 com 1 dia de atraso; visto de 20/12 a mora nao cresceu
    const linhas = resolveContrato(CONTRATO_SHOW, '2026-12-20', null, {
      'show-saldo': '2026-12-09',
    })
    const saldo = linhas.find((l) => l.id === 'show-saldo')!
    expect(saldo.cumpridaEm).toBe('2026-12-09')
    expect(saldo.moraCongelada?.diasAtraso).toBe(1)
    // multa 2% de 5810 = 116,20; juros de 1% a.m. pro rata die por 1 dia = 1,94
    expect(saldo.moraCongelada?.multa).toBeCloseTo(116.2, 2)
    expect(saldo.moraCongelada?.juros).toBeCloseTo(1.94, 2)
    expect(saldo.moraCongelada?.total).toBe(
      calculaMora(5810, '2026-12-08', '2026-12-09', CONTRATO_SHOW.mora).total,
    )
  })

  it('pagar no dia do vencimento marca como feita sem mora congelada', () => {
    const linhas = resolveContrato(CONTRATO_SHOW, HOJE, null, {
      'show-saldo': '2026-12-08',
    })
    const saldo = linhas.find((l) => l.id === 'show-saldo')!
    expect(saldo.cumpridaEm).toBe('2026-12-08')
    expect(saldo.moraCongelada).toBeUndefined()
  })

  it('a condicao "parcela em aberto" so desativa com todas as cobraveis quitadas', () => {
    const soSaldo = resolveContrato(CONTRATO_SHOW, HOJE, null, {
      'show-saldo': HOJE,
    })
    expect(
      soSaldo.find((l) => l.id === 'show-decisao')?.condicaoDesativada,
    ).toBeUndefined()

    const tudo = resolveContrato(CONTRATO_SHOW, HOJE, null, {
      'show-entrada': HOJE,
      'show-saldo': HOJE,
    })
    expect(tudo.find((l) => l.id === 'show-decisao')?.condicaoDesativada).toBe(
      true,
    )
    expect(montaEmail(CONTRATO_SHOW, tudo, HOJE)).toBeNull()
  })
})

describe('contagens com cumpridas', () => {
  it('cumprida sai de vencidas e entra em cumpridas', () => {
    const antes = contagens(resolveContrato(CONTRATO_SHOW, HOJE))
    const depois = contagens(
      resolveContrato(CONTRATO_SHOW, HOJE, null, { 'show-saldo': HOJE }),
    )
    expect(antes.cumpridas).toBe(0)
    expect(depois.cumpridas).toBe(1)
    expect(depois.vencidas).toBe(antes.vencidas - 1)
  })
})

describe('estado do cumprimento na URL', () => {
  it('le feito repetido e descarta o malformado', () => {
    const estado = leEstado({
      feito: ['show-saldo.2026-12-09', 'lixo', 'Maiusculo.2026-12-09'],
    })
    expect(estado.feitos).toEqual({ 'show-saldo': '2026-12-09' })
  })

  it('serializa um param feito por entrada e o toggle preserva as outras', () => {
    const estado = leEstado({ passo: '5', feito: 'show-saldo.2026-12-09' })
    const marcada = comFeito(estado.feitos, 'show-entrada', '2026-12-09')
    expect(hrefDemo(estado, { feitos: marcada })).toBe(
      '/?passo=5&feito=show-saldo.2026-12-09&feito=show-entrada.2026-12-09',
    )
    expect(semFeito(marcada, 'show-saldo')).toEqual({
      'show-entrada': '2026-12-09',
    })
  })
})
