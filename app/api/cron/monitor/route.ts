import { NextResponse } from 'next/server'
import { differenceInCalendarDays } from 'date-fns'

import {
  agoraSemRequisicao,
  demoPermitida,
  hojeISO,
  parseInstante,
  HEADER_DEMO,
} from '@/lib/clock'
import { deISO } from '@/lib/motor-datas'

/**
 * O monitor diario. E isto que separa "leitor de contrato" de autopilot.
 *
 * Roda todo dia as 06:00 de Sao Paulo. Nao chama modelo nenhum: e uma query
 * comparando datas com hoje, entao o custo marginal de vigiar um contrato por
 * um ano e praticamente zero.
 *
 * Idempotencia mora no banco, no unique (data_id, janela) da tabela alertas,
 * nao numa flag aqui: rodar duas vezes no mesmo dia nao manda o alerta duas vezes.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Quantos dias antes cada tipo de obrigacao merece um aviso. */
const JANELAS: Record<string, number[]> = {
  saldo_pre_evento: [15, 7, 3, 1, 0],
  parcela: [7, 1, 0],
  entrega_material: [45, 30, 15, 7, 0],
  fronteira_cancelamento: [15, 7, 1],
  decisao_comparecimento: [7, 3, 1],
  gatilho_rescisao: [3, 1, 0],
  entrega_pos_contrato: [15, 7, 0],
  janela_alteracoes: [15, 7, 0],
}

function autorizado(req: Request): boolean {
  const segredo = process.env.CRON_SECRET
  // Fail-closed: sem segredo configurado, nada roda. No dia em que o monitor
  // disparar e-mail de verdade, uma rota aberta dispararia cobranca de
  // cliente na data que o atacante quisesse. Em dev, ponha CRON_SECRET no
  // .env.local (qualquer string) e mande o header Bearer igual.
  if (!segredo) return false
  return req.headers.get('authorization') === `Bearer ${segredo}`
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: 'nao autorizado' }, { status: 401 })
  }

  // O relogio da demo tambem vale aqui: e assim que o e-mail chega na frente
  // do juri sem esperar quatro meses. So em palco declarado (lib/clock.ts).
  const doHeader = demoPermitida() ? req.headers.get(HEADER_DEMO) : null
  const instante = (doHeader && parseInstante(doHeader)) || agoraSemRequisicao()
  const hoje = hojeISO(instante)

  // TODO(P2): ler watchdog.datas com status ativa, avaliar a condicao de cada
  // data condicional, agrupar por contrato e enviar UM e-mail por contrato.
  // Agrupar nao e refinamento: nos contratos reais quatro obrigacoes caem no
  // mesmo dia, e quatro e-mails treinam a pessoa a ignorar.
  const pendentes: unknown[] = []

  return NextResponse.json({
    ok: true,
    hoje,
    relogio: doHeader ? 'demo' : process.env.DEMO_NOW ? 'env' : 'real',
    janelas: JANELAS,
    avaliadas: pendentes.length,
    alertas_enviados: 0,
  })
}

/** Util para o painel de demo disparar o monitor numa data escolhida. */
export async function POST(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: 'nao autorizado' }, { status: 401 })
  }
  const { quando } = await req.json().catch(() => ({ quando: null }))
  const alvo = typeof quando === 'string' ? parseInstante(quando) : null
  if (!alvo) {
    return NextResponse.json({ erro: 'informe "quando" em ISO' }, { status: 400 })
  }
  const dias = differenceInCalendarDays(deISO(hojeISO(alvo)), deISO(hojeISO(agoraSemRequisicao())))
  return NextResponse.json({ ok: true, viajou: `${dias} dias`, quando })
}
