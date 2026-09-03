import type { VercelConfig } from '@vercel/config/v1'

export const config: VercelConfig = {
  framework: 'nextjs',
  // O monitor roda todo dia as 06:00 de Sao Paulo. O cron da Vercel e em UTC,
  // e Sao Paulo esta em UTC-3 o ano inteiro desde o fim do horario de verao.
  crons: [{ path: '/api/cron/monitor', schedule: '0 9 * * *' }],
}
