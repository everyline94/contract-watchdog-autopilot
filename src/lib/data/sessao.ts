"use server";

/**
 * Sessao mockada de usuario fixo. Quando o auth entrar, so este arquivo muda:
 * a assinatura fica, a origem do usuario troca.
 */
import type { Sessao } from "./tipos";

export async function sessaoAtual(): Promise<Sessao> {
  return {
    usuario: {
      id: "u-01",
      nome: "Bruno Lujan",
      email: "bruno@revelio.app",
    },
  };
}
