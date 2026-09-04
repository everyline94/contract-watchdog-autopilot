/**
 * O estado da demo mora inteiro na URL. Isso e decisao de palco: qualquer
 * passo tem link direto (plano B instantaneo), a resposta do contrato sem
 * data e um form GET sem JavaScript, e o relogio da demo e um parametro
 * legivel, nao um segredo em header.
 */
import { deISO } from "@/lib/motor-datas";

export const TITULOS_PASSOS = [
  "O problema",
  "O contrato entra",
  "As datas aparecem",
  "O que o sistema não sabe",
  "O tempo passa",
  "Onde o humano entra",
] as const;

export type EstadoDemo = {
  passo: number;
  /** Relogio da demo (ISO). null = relogio real. */
  agora: string | null;
  /** Resposta da pergunta do contrato sem data de evento (ISO). */
  evento: string | null;
  /** Campo selecionado na ficha do passo 2. */
  campo: string | null;
  /** Obrigacoes marcadas como feitas: id -> data ISO do cumprimento. */
  feitos: Record<string, string>;
};

const RE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Separador ponto, nao arroba: o arroba viraria %40 nos links gerados. */
const RE_FEITO = /^([a-z][a-z0-9-]{0,40})\.(\d{4}-\d{2}-\d{2})$/;

const primeiro = (v: string | string[] | undefined): string | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

const todos = (v: string | string[] | undefined): string[] =>
  Array.isArray(v) ? v : v ? [v] : [];

/** Forma E calendario: ?agora=2026-02-31 e descartado, nao vira 03/03. */
const dataValida = (v: string | null): string | null => {
  if (!v || !RE_ISO.test(v)) return null;
  try {
    deISO(v);
  } catch {
    return null;
  }
  return v;
};

export function leEstado(
  sp: Record<string, string | string[] | undefined>,
): EstadoDemo {
  const bruto = Number(primeiro(sp.passo) ?? "1");
  const passo = Number.isInteger(bruto) ? Math.min(Math.max(bruto, 1), 6) : 1;
  const feitos: Record<string, string> = {};
  for (const par of todos(sp.feito)) {
    const m = RE_FEITO.exec(par);
    if (m && dataValida(m[2])) feitos[m[1]] = m[2];
  }
  return {
    passo,
    agora: dataValida(primeiro(sp.agora)),
    evento: dataValida(primeiro(sp.evento)),
    campo: primeiro(sp.campo),
    feitos,
  };
}

/**
 * Monta um href preservando o estado atual. Sobrescrever com null remove o
 * parametro; omitir mantem o que esta.
 */
export function hrefDemo(
  atual: EstadoDemo,
  muda: Partial<EstadoDemo>,
): string {
  const alvo = { ...atual, ...muda };
  const q = new URLSearchParams();
  if (alvo.passo !== 1) q.set("passo", String(alvo.passo));
  if (alvo.agora) q.set("agora", alvo.agora);
  if (alvo.evento) q.set("evento", alvo.evento);
  if (alvo.campo && alvo.passo === 2) q.set("campo", alvo.campo);
  for (const [id, data] of Object.entries(alvo.feitos)) {
    q.append("feito", `${id}.${data}`);
  }
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

/**
 * Toggle do cumprimento. hrefDemo faz spread raso, entao quem muda `feitos`
 * precisa mandar o record inteiro: estes dois montam ele sem perder as
 * outras marcas.
 */
export const comFeito = (
  feitos: Record<string, string>,
  id: string,
  data: string,
): Record<string, string> => ({ ...feitos, [id]: data });

export const semFeito = (
  feitos: Record<string, string>,
  id: string,
): Record<string, string> =>
  Object.fromEntries(Object.entries(feitos).filter(([k]) => k !== id));
