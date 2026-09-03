/**
 * Data escrita por extenso vira ISO por codigo deterministico.
 *
 * O modelo devolve a data COMO ESCRITA no contrato ("12 de dezembro de
 * 2026"), por regra do schema congelado. Quem converte para 2026-12-12 e
 * esta funcao, nunca o modelo.
 */
const MESES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  ["março"]: 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Ida e volta no calendario: 31/02 nao vira 03/03 em silencio. Data que nao
 * existe devolve null e o campo vai pra fila, nao pro calendario.
 */
function civilValida(a: number, m: number, d: number): string | null {
  const data = new Date(Date.UTC(a, m - 1, d));
  const existe =
    data.getUTCFullYear() === a &&
    data.getUTCMonth() === m - 1 &&
    data.getUTCDate() === d;
  return existe ? `${a}-${pad(m)}-${pad(d)}` : null;
}

export function paraISOData(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const t = texto.trim().toLowerCase();

  // ja e ISO
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return civilValida(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // dd/mm/aaaa ou dd-mm-aaaa
  const barra = t.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (barra) {
    const [, d, m, a] = barra;
    return civilValida(Number(a), Number(m), Number(d));
  }

  // "12 de dezembro de 2026"
  const extenso = t.match(/(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/);
  if (extenso) {
    const [, d, mes, a] = extenso;
    const m = MESES[mes];
    if (m) return civilValida(Number(a), m, Number(d));
  }

  return null;
}
