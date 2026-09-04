/**
 * O relogio. Nenhum outro lugar do projeto chama `new Date()`.
 *
 * O produto vigia o tempo e a demo dura cinco minutos. Sem um agora
 * sobrescrevivel, o monitoramento continuo, que e a tese inteira, fica
 * invisivel no palco. Com ele, avanca-se quatro meses na frente do juri e o
 * e-mail chega.
 *
 * Precedencia: header da requisicao > variavel de ambiente > relogio real.
 * O header serve para o painel de demo mexer no tempo sem redeploy.
 */
import { headers } from 'next/headers'

export const FUSO = 'America/Sao_Paulo'
export const HEADER_DEMO = 'x-demo-now'

const RE_DATA_CIVIL = /^\d{4}-\d{2}-\d{2}$/

/**
 * Valor sem hora ("2026-12-09") e data civil de Sao Paulo, nao meia-noite
 * UTC: `new Date` cru jogaria o relogio pra 21:00 do dia ANTERIOR em SP, e o
 * README ensina exatamente o formato sem hora. Ancora ao meio-dia de SP.
 */
export function parseInstante(valor: string): Date | null {
  const v = valor.trim()
  const d = RE_DATA_CIVIL.test(v) ? new Date(`${v}T12:00:00-03:00`) : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * O header de demo so vale onde o palco e legitimo: na maquina local ou num
 * deploy declarado de demonstracao (DEMO_PALCO=1). Em producao sem a flag,
 * header de estranho nao mexe no relogio de rota nenhuma.
 */
export function demoPermitida(): boolean {
  return !process.env.VERCEL || process.env.DEMO_PALCO === '1'
}

/** Versao para Server Components e Route Handlers. */
export async function agora(): Promise<Date> {
  if (demoPermitida()) {
    try {
      const h = await headers()
      const doHeader = h.get(HEADER_DEMO)
      if (doHeader) {
        const d = parseInstante(doHeader)
        if (d) return d
      }
    } catch {
      // fora do ciclo de requisicao (cron, script, teste): segue para o env
    }
  }
  return agoraSemRequisicao()
}

/** Versao sincrona, para cron, scripts e teste. */
export function agoraSemRequisicao(): Date {
  const doEnv = process.env.DEMO_NOW
  if (doEnv) {
    const d = parseInstante(doEnv)
    if (d) return d
  }
  return new Date()
}

/** Data local de Sao Paulo em ISO (YYYY-MM-DD), sem componente de hora. */
export function hojeISO(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}
