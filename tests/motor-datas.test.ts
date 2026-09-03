/**
 * Testes do motor. Os casos NAO sao inventados: cada um sai de uma clausula
 * real dos tres contratos em contratos/preenchidos/, e o resultado esperado
 * esta no GABARITO.json.
 */
import { describe, it, expect } from 'vitest'
import {
  deISO, paraISO, somaDias, somaMeses, somaDiasUteis, ajustaBorda,
  resolvePrazo, auditaCoerencia, auditaAritmetica, calculaMora, reajusteAcumulado,
} from '@/lib/motor-datas'
import { feriadosEntre, feriadosNacionais, feriadosPadrao } from '@/lib/feriados'
import { PrazoRelativo as SchemaPrazoRelativo, type PrazoRelativo } from '@/lib/types'

const FERIADOS = feriadosEntre(2023, 2027)

const prazo = (p: Partial<PrazoRelativo>): PrazoRelativo => ({
  ancora: 'evento', ancora_ref: null, sentido: 'antes', quantidade: 1,
  quantidade_ate: null, unidade: 'dias', base: 'corridos',
  condicao: null, condicao_morta: false, ...p,
})

// evento do contrato A: 12/12/2026, sabado
const EVENTO_A = { evento: '2026-12-12' }

describe('aritmetica de data civil', () => {
  it('soma dias sem escorregar pelo horario de verao', () => {
    expect(paraISO(somaDias(deISO('2026-10-17'), 1))).toBe('2026-10-18')
    expect(paraISO(somaDias(deISO('2026-02-28'), 1))).toBe('2026-03-01')
    expect(paraISO(somaDias(deISO('2024-02-28'), 1))).toBe('2024-02-29')
  })

  it('vira o ano', () => {
    expect(paraISO(somaDias(deISO('2026-12-31'), 1))).toBe('2027-01-01')
    expect(paraISO(somaDias(deISO('2027-01-01'), -1))).toBe('2026-12-31')
  })

  it('soma meses travando no ultimo dia quando o alvo e mais curto', () => {
    expect(paraISO(somaMeses(deISO('2026-01-31'), 1))).toBe('2026-02-28')
    expect(paraISO(somaMeses(deISO('2024-01-31'), 1))).toBe('2024-02-29')
    expect(paraISO(somaMeses(deISO('2026-08-31'), 2))).toBe('2026-10-31')
  })

  it('conta dia util pulando fim de semana e feriado', () => {
    // 2026-12-24 quinta; 25 e Natal, 26 sabado, 27 domingo
    expect(paraISO(somaDiasUteis(deISO('2026-12-24'), 1, FERIADOS))).toBe('2026-12-28')
  })
})

describe('regra de borda', () => {
  it('prazo para tras ANTECIPA, porque postergar e perder o prazo', () => {
    // saldo do contrato A cai em 2026-12-05, sabado
    expect(paraISO(ajustaBorda(deISO('2026-12-05'), 'antes', FERIADOS))).toBe('2026-12-04')
  })

  it('prazo para frente POSTERGA', () => {
    expect(paraISO(ajustaBorda(deISO('2026-12-05'), 'depois', FERIADOS))).toBe('2026-12-07')
  })

  it('atravessa feriado emendado', () => {
    // 2026-12-25 sexta (Natal) -> para tras cai em 24
    expect(paraISO(ajustaBorda(deISO('2026-12-25'), 'antes', FERIADOS))).toBe('2026-12-24')
  })
})

describe('contrato A: VJ presencial, evento 12/12/2026', () => {
  it('saldo, "ate 07 dias antes do evento", antecipa do sabado para a sexta', () => {
    const r = resolvePrazo(prazo({ quantidade: 7 }), EVENTO_A, FERIADOS)
    expect(r.data).toBe('2026-12-04') // 05/12 e sabado
  })

  it('saldo sem ajuste de borda da a data crua da clausula', () => {
    const r = resolvePrazo(prazo({ quantidade: 7 }), EVENTO_A, FERIADOS, { ajustarBorda: false })
    expect(r.data).toBe('2026-12-05')
  })

  it('materiais, pixelmap e contato tecnico caem todos em evento menos 30', () => {
    const r = resolvePrazo(prazo({ quantidade: 30 }), EVENTO_A, FERIADOS)
    expect(r.data).toBe('2026-11-12') // quinta, nao precisa de ajuste
  })

  it('fronteira de cancelamento de 30%: evento menos 60', () => {
    const r = resolvePrazo(prazo({ quantidade: 60 }), EVENTO_A, FERIADOS)
    expect(r.data).toBe('2026-10-13')
  })

  it('decisao de comparecer: 48 HORAS antes, nao dois dias', () => {
    const r = resolvePrazo(
      prazo({ quantidade: 48, unidade: 'horas', condicao: 'saldo_em_aberto > 0' }),
      EVENTO_A, FERIADOS,
    )
    expect(r.data).toBe('2026-12-10')
  })

  it('gatilho de rescisao conta a partir da PARCELA, nao do evento', () => {
    const r = resolvePrazo(
      prazo({ ancora: 'parcela', sentido: 'depois', quantidade: 10 }),
      { parcela: '2026-08-14' }, FERIADOS,
    )
    expect(r.data).toBe('2026-08-24')
  })
})

describe('contrato B: ancora ausente', () => {
  it('sem data de evento, devolve pendencia em vez de chutar', () => {
    const r = resolvePrazo(prazo({ quantidade: 7 }), { evento: null }, FERIADOS)
    expect(r.data).toBeNull()
    expect(r.pendencia).toEqual({ motivo: 'ancora_desconhecida', depende_de: 'evento' })
  })

  it('a parcela com data absoluta continua calculavel mesmo sem o evento', () => {
    const r = resolvePrazo(
      prazo({ ancora: 'parcela', sentido: 'depois', quantidade: 10 }),
      { evento: null, parcela: '2026-09-05' }, FERIADOS,
    )
    expect(r.data).toBe('2026-09-15')
  })
})

describe('contrato C: filmagem, evento 08/05/2026', () => {
  const EVENTO_C = { evento: '2026-05-08' }

  it('entrega em FAIXA: "de ate 90 ate 120 dias a contar do evento"', () => {
    const r = resolvePrazo(
      prazo({ sentido: 'depois', quantidade: 90, quantidade_ate: 120 }),
      EVENTO_C, FERIADOS,
    )
    expect(r.data).toBe('2026-08-06')
    // 05/09 e sabado e 07/09 (segunda) e feriado: posterga pulando a emenda
    expect(r.data_ate).toBe('2026-09-08')
  })

  it('janela de alteracoes deriva da ENTREGA, que ela mesma e derivada', () => {
    const entrega = resolvePrazo(
      prazo({ sentido: 'depois', quantidade: 90 }), EVENTO_C, FERIADOS,
    )
    const alteracoes = resolvePrazo(
      prazo({ ancora: 'entrega', sentido: 'depois', quantidade: 30 }),
      { entrega: entrega.data }, FERIADOS,
    )
    expect(alteracoes.data).toBe('2026-09-08')
  })

  it('material bruto: dois MESES apos a entrega', () => {
    const r = resolvePrazo(
      prazo({ ancora: 'entrega', sentido: 'depois', quantidade: 2, unidade: 'meses' }),
      { entrega: '2026-08-06' }, FERIADOS,
    )
    expect(r.data).toBe('2026-10-06')
  })

  it('ensaio sem data deixa a remarcacao por chuva pendente', () => {
    const r = resolvePrazo(
      prazo({ ancora: 'evento_secundario', ancora_ref: 'ensaio', quantidade: 1 }),
      { nomeadas: { ensaio: null } }, FERIADOS,
    )
    expect(r.data).toBeNull()
    expect(r.pendencia?.depende_de).toBe('evento_secundario')
  })
})

describe('auditoria de coerencia', () => {
  it('pega a divergencia INTENCIONAL do contrato A', () => {
    // a clausula 3.1 da 05/12, o item 3.1.ii escreve 08/12
    const aviso = auditaCoerencia('2026-12-05', '2026-12-08')
    expect(aviso).toContain('2026-12-05')
    expect(aviso).toContain('2026-12-08')
    expect(aviso).toContain('3 dia(s) depois')
  })

  it('cala quando batem', () => {
    expect(auditaCoerencia('2026-12-05', '2026-12-05')).toBeNull()
  })

  it('confere a aritmetica do contrato B: 30% de 3290 = 987', () => {
    expect(auditaAritmetica(3290, 30, 987)).toBeNull()
    expect(auditaAritmetica(3290, 70, 2303)).toBeNull()
  })

  it('acusa quando o percentual nao fecha com o valor escrito', () => {
    expect(auditaAritmetica(3290, 30, 900)).toContain('987.00')
  })
})

describe('mora', () => {
  it('nao cobra nada antes do vencimento', () => {
    const m = calculaMora(2303, '2026-11-30', '2026-11-25',
      { multaPercentual: 2, jurosMensalPercentual: 1, proRataDie: true })
    expect(m.total).toBe(2303)
    expect(m.diasAtraso).toBe(0)
  })

  it('multa fixa mais juros pro rata die, com o valor exato do contrato B', () => {
    const m = calculaMora(2303, '2026-11-30', '2026-12-12',
      { multaPercentual: 2, jurosMensalPercentual: 1, proRataDie: true })
    expect(m.diasAtraso).toBe(12)
    expect(m.multa).toBe(46.06)          // 2% de 2303
    expect(m.juros).toBe(9.21)           // 1% * 12/30
    expect(m.total).toBe(2358.27)
  })

  it('sem pro rata die, o mes conta inteiro', () => {
    const m = calculaMora(1000, '2026-01-01', '2026-01-05',
      { multaPercentual: 2, jurosMensalPercentual: 1, proRataDie: false })
    expect(m.juros).toBe(10)
  })
})

describe('reajuste', () => {
  it('acumula por produtorio, nao por soma', () => {
    const doze = Array(12).fill(0.4)
    expect(reajusteAcumulado(doze)).toBeCloseTo(4.9070, 3)
    expect(reajusteAcumulado(doze)).not.toBeCloseTo(4.8, 2) // a soma daria 4.8
  })

  it('aceita deflacao', () => {
    expect(reajusteAcumulado([1, -0.5])).toBeCloseTo(0.495, 3)
  })
})

describe('correcoes da auditoria dupla (cada teste pegaria o bug antes)', () => {
  it('deISO rejeita data que nao existe em vez de normalizar', () => {
    expect(() => deISO('2026-02-31')).toThrow(RangeError)
    expect(() => deISO('2026-13-01')).toThrow(RangeError)
    expect(paraISO(deISO('2024-02-29'))).toBe('2024-02-29')
  })

  it('faixa com sentido "antes" sai em ordem cronologica', () => {
    // "90 a 120 dias antes do evento": o teto conta mais pra tras que o piso
    const r = resolvePrazo(
      prazo({ sentido: 'antes', quantidade: 90, quantidade_ate: 120 }),
      EVENTO_A, FERIADOS,
    )
    expect(r.data).not.toBeNull()
    expect(r.data_ate).not.toBeNull()
    expect(r.data! <= r.data_ate!).toBe(true)
  })

  it('offset zero resolve na propria ancora (50% na assinatura, C03)', () => {
    const r = resolvePrazo(
      prazo({ ancora: 'assinatura', sentido: 'depois', quantidade: 0 }),
      { assinatura: '2025-09-10' }, FERIADOS,
    )
    expect(r.data).toBe('2025-09-10')
  })

  it('o schema aceita offset zero e recusa fracao de dia', () => {
    const base = prazo({ ancora: 'assinatura', sentido: 'depois' })
    expect(SchemaPrazoRelativo.safeParse({ ...base, quantidade: 0 }).success).toBe(true)
    expect(SchemaPrazoRelativo.safeParse({ ...base, quantidade: 0.5 }).success).toBe(false)
  })

  it('mora: o total fecha com a soma das linhas exibidas', () => {
    // 100,20 por 13 dias: multa 2,00 + juros 0,43. Antes o total saia 102,64.
    const m = calculaMora(100.20, '2026-11-01', '2026-11-14',
      { multaPercentual: 2, jurosMensalPercentual: 1, proRataDie: true })
    expect(m.diasAtraso).toBe(13)
    expect(m.multa).toBe(2.00)
    expect(m.juros).toBe(0.43)
    expect(m.total).toBe(102.63)
  })

  it('auditaAritmetica confere centavo por padrao, nao um real', () => {
    expect(auditaAritmetica(8300, 30, 2490.00)).toBeNull()
    expect(auditaAritmetica(8300, 30, 2490.50)).not.toBeNull()
  })

  it('20/11 so e feriado nacional a partir de 2024 (Lei 14.759/2023)', () => {
    expect(feriadosNacionais(2023)).not.toContain('2023-11-20')
    expect(feriadosNacionais(2024)).toContain('2024-11-20')
  })

  it('demo e leitor compartilham a mesma janela de feriados', () => {
    const f = feriadosPadrao()
    expect(f.has('2023-12-25')).toBe(true)
    expect(f.has('2032-09-07')).toBe(true)
  })
})
