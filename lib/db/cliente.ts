/**
 * Clientes do Supabase.
 *
 * O schema `watchdog` nao tem policy para anon: contrato carrega CPF, endereco
 * e valor, e a plataforma e operadora de dado de terceiro. Toda escrita passa
 * pelo servidor com service role.
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

/** Servidor. Passa por cima do RLS: nunca importar em componente de cliente. */
export function clienteServidor() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!chave) {
    // sem identificador de projeto na mensagem: erro pode vazar pra fora
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY ausente. Configure no ambiente do servidor ' +
        '(dashboard do Supabase, secao API keys do projeto).',
    )
  }
  return createClient(URL, chave, {
    db: { schema: 'watchdog' },
    auth: { persistSession: false },
  })
}

/** Navegador. Le pelo RLS, so para usuario autenticado. */
export function clienteNavegador() {
  return createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    db: { schema: 'watchdog' },
  })
}
