/**
 * O bug que este arquivo teria pego: DEMO_NOW=2026-12-09 (sem hora) era
 * parseado como meia-noite UTC, que em Sao Paulo e 21:00 do dia 08, e a demo
 * abria no dia anterior. O README ensina exatamente o formato sem hora.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { agoraSemRequisicao, hojeISO, parseInstante } from '@/lib/clock'

afterEach(() => {
  delete process.env.DEMO_NOW
})

describe('relogio injetavel', () => {
  it('valor sem hora e data civil de Sao Paulo, nao meia-noite UTC', () => {
    expect(hojeISO(parseInstante('2026-12-09')!)).toBe('2026-12-09')
  })

  it('valor com hora explicita vale como instante', () => {
    expect(hojeISO(parseInstante('2026-12-02T09:00:00-03:00')!)).toBe('2026-12-02')
    // 01:30 UTC ainda e dia 1 em Sao Paulo: o instante manda
    expect(hojeISO(parseInstante('2026-12-02T01:30:00Z')!)).toBe('2026-12-01')
  })

  it('valor invalido devolve null e o relogio real assume', () => {
    expect(parseInstante('nao-e-data')).toBeNull()
  })

  it('DEMO_NOW sem hora abre a demo no dia certo', () => {
    process.env.DEMO_NOW = '2026-12-09'
    expect(hojeISO(agoraSemRequisicao())).toBe('2026-12-09')
  })
})
