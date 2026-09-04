/**
 * Feriados nacionais para contagem de dia util.
 *
 * Contrato brasileiro distingue "90 dias" de "60 dias uteis", e errar isso
 * desloca a data em duas semanas. Os moveis derivam da Pascoa por Meeus/Jones/
 * Butcher, entao a tabela nao precisa de manutencao anual.
 *
 * Feriado municipal fica fora de proposito: varia por cidade e o MVP nao sabe
 * onde o contrato roda. Quando souber, entra aqui por municipio.
 */

function pascoa(ano: number): Date {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(ano, mes - 1, dia))
}

const DIA = 86_400_000
const iso = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Feriados nacionais do ano, em ISO.
 *
 * Decisao de produto, registrada: segunda e terca de carnaval e Corpus
 * Christi sao PONTO FACULTATIVO no calendario federal, nao feriado nacional.
 * Entram no conjunto mesmo assim porque na pratica banco, cartorio e
 * fornecedor de evento nao operam nesses dias, e o produto e um sistema de
 * ALERTA: errar pro lado de avisar um dia util antes e seguro, errar pro
 * lado de contar um dia que nao funciona e perder o prazo. 20/11 so vale
 * como feriado nacional a partir de 2024 (Lei 14.759/2023).
 */
export function feriadosNacionais(ano: number): string[] {
  const p = pascoa(ano).getTime()
  return [
    `${ano}-01-01`, // Confraternizacao Universal
    `${ano}-04-21`, // Tiradentes
    `${ano}-05-01`, // Dia do Trabalho
    `${ano}-09-07`, // Independencia
    `${ano}-10-12`, // Nossa Senhora Aparecida
    `${ano}-11-02`, // Finados
    `${ano}-11-15`, // Proclamacao da Republica
    ...(ano >= 2024 ? [`${ano}-11-20`] : []), // Consciencia Negra, Lei 14.759/2023
    `${ano}-12-25`, // Natal
    iso(new Date(p - 48 * DIA)), // segunda de carnaval (ponto facultativo, ver acima)
    iso(new Date(p - 47 * DIA)), // terca de carnaval (ponto facultativo, ver acima)
    iso(new Date(p - 2 * DIA)),  // Sexta-feira Santa
    iso(new Date(p + 60 * DIA)), // Corpus Christi (ponto facultativo, ver acima)
  ].sort()
}

/** Conjunto cobrindo o intervalo de anos pedido, inclusive. */
export function feriadosEntre(anoIni: number, anoFim: number): Set<string> {
  const s = new Set<string>()
  for (let a = anoIni; a <= anoFim; a++) feriadosNacionais(a).forEach((d) => s.add(d))
  return s
}

/**
 * A janela unica do projeto. Demo e leitor usam O MESMO conjunto: duas
 * janelas divergentes ja fizeram a mesma pergunta calcular com feriado num
 * lugar e sem no outro. Fora da janela a contagem segue sem feriado nenhum,
 * entao ela cobre com folga os anos que os contratos da demo alcancam.
 */
export const JANELA_FERIADOS: readonly [number, number] = [2023, 2032]

export function feriadosPadrao(): Set<string> {
  return feriadosEntre(JANELA_FERIADOS[0], JANELA_FERIADOS[1])
}
