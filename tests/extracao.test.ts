/**
 * Testes da camada de extracao. Cada caso aqui reproduz um bug real achado
 * na auditoria dupla de 29/08/2026: teria falhado antes da correcao.
 */
import { describe, it, expect } from 'vitest'

import { contratoVazio } from '@/lib/extracao/extrator'
import { paraISOData } from '@/lib/extracao/datas'
import { paraLinhas } from '@/lib/extracao/para-linhas'
import { ordenaItens } from '@/lib/extracao/pdf'
import { leEstado } from '@/lib/demo/url'
import { ContratoExtraido, type Evidencia } from '@/lib/types'

const ev = (confianca: number): Evidencia => ({
  citacao: 'um trecho literal do contrato de teste',
  pagina: 1,
  clausula: 'Cláusula 1ª',
  item: null,
  confianca,
})

const campo = <T,>(valor: T, confianca = 0.95) => ({
  valor,
  motivo: null,
  detalhe_pendencia: null,
  evidencia: ev(confianca),
})

const vazio = () => ({
  valor: null,
  motivo: 'ausente' as const,
  detalhe_pendencia: null,
  evidencia: null,
})

describe('ancoras do adaptador', () => {
  it('regra com ancora "parcela" sem ancora_ref resolve pela entrada', () => {
    // Antes, a ancora parcela so existia em `nomeadas`, que o motor consulta
    // apenas com ancora_ref: a regra ficava pendente com a entrada conhecida.
    const c = contratoVazio()
    c.evento.data = vazio()
    c.parcelas = [
      {
        ordem: 1,
        percentual: campo(30),
        valor: campo(987),
        data_escrita: campo('05/09/2026'),
        prazo_relativo: vazio(),
      },
    ] as ContratoExtraido['parcelas']
    c.obrigacoes_prazo = [
      {
        descricao: 'gatilho de rescisão por atraso',
        devedor: 'contratante',
        devedor_detalhe: null,
        prazo: campo({
          ancora: 'parcela',
          ancora_ref: null,
          sentido: 'depois',
          quantidade: 10,
          quantidade_ate: null,
          unidade: 'dias',
          base: 'corridos',
          condicao: null,
          condicao_morta: false,
        }),
        consequencia: campo('rescisão do contrato'),
      },
    ] as ContratoExtraido['obrigacoes_prazo']

    const leitura = paraLinhas(c, '2026-09-01')
    const linha = leitura.linhas.find((l) => l.id === 'obrigacao-0')
    expect(linha?.data).toBe('2026-09-15')
  })
})

describe('corte de confianca', () => {
  it('campo abaixo de 0,85 nao vira data: vai pra fila humana', () => {
    // Antes, qualquer confianca acima de zero entrava no calendario.
    const c = contratoVazio()
    c.evento.data = campo('12 de dezembro de 2026', 0.5)

    const leitura = paraLinhas(c, '2026-09-01')
    const evento = leitura.linhas.find((l) => l.id === 'evento')
    expect(evento?.data).toBeNull()
    expect(leitura.fila.some((p) => p.sobre === 'Data do evento')).toBe(true)
  })
})

describe('data civil validada de ida e volta', () => {
  it('data que nao existe no calendario devolve null, nunca rollover', () => {
    expect(paraISOData('31/02/2026')).toBeNull()
    expect(paraISOData('2026-02-31')).toBeNull()
    expect(paraISOData('29 de fevereiro de 2026')).toBeNull()
    expect(paraISOData('29 de fevereiro de 2024')).toBe('2024-02-29')
  })
})

describe('estado na URL', () => {
  it('?agora com data inexistente e descartado, nao normalizado', () => {
    expect(leEstado({ agora: '2026-02-31' }).agora).toBeNull()
    expect(leEstado({ agora: '2026-12-02' }).agora).toBe('2026-12-02')
  })
})

describe('ordem de leitura do PDF', () => {
  it('ordena por y (topo primeiro) e x, nao pela ordem do arquivo', () => {
    // Licao do contrato C: anonimizacao joga blocos novos pro fim do arquivo.
    const itens = [
      { str: 'terceira', transform: [1, 0, 0, 1, 50, 500] },
      { str: 'primeira', transform: [1, 0, 0, 1, 50, 700] },
      { str: 'linha', transform: [1, 0, 0, 1, 120, 700] },
    ]
    expect(ordenaItens(itens).map((i) => i.str)).toEqual([
      'primeira',
      'linha',
      'terceira',
    ])
  })
})

describe('invariantes mecanicas do schema', () => {
  it('o esqueleto de fallback passa no schema completo', () => {
    expect(ContratoExtraido.safeParse(contratoVazio()).success).toBe(true)
  })

  it('valor null sem motivo reprova', () => {
    const c = contratoVazio() as Record<string, unknown> & ContratoExtraido
    c.evento.data = {
      valor: null,
      motivo: null,
      detalhe_pendencia: null,
      evidencia: null,
    }
    expect(ContratoExtraido.safeParse(c).success).toBe(false)
  })

  it('valor presente sem evidencia reprova', () => {
    const c = contratoVazio() as Record<string, unknown> & ContratoExtraido
    c.evento.data = {
      valor: '12 de dezembro de 2026',
      motivo: null,
      detalhe_pendencia: null,
      evidencia: null,
    }
    expect(ContratoExtraido.safeParse(c).success).toBe(false)
  })
})
