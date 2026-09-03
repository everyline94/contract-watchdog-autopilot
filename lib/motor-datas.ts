/**
 * O motor de datas. Funcao PURA: nao le relogio, nao faz IO, nao chama modelo.
 *
 * E aqui que mora o produto. O LLM le o contrato e devolve a REGRA
 * ("sete dias antes do evento") com a citacao literal. Quem transforma isso em
 * 2026-12-05 e este arquivo, com teste unitario. O modelo nunca calcula.
 *
 * Todas as datas sao tratadas como data civil de Sao Paulo, em UTC ao meio-dia
 * para que soma e subtracao de dias nunca cruzem a fronteira do dia por causa
 * de horario de verao.
 */
import Decimal from 'decimal.js'
import type { PrazoRelativo, Ancora } from './types'

const DIA_MS = 86_400_000

// ─────────────────────────── data civil ───────────────────────────

/** ISO (YYYY-MM-DD) para um instante ancorado ao meio-dia UTC. */
export function deISO(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  const data = new Date(Date.UTC(a, m - 1, d, 12, 0, 0))
  // Ida e volta: sem isto, 2026-02-31 normaliza pra 03-03 em silencio e vira
  // um prazo valido na data errada. Data que nao existe e erro, nao rollover.
  if (
    data.getUTCFullYear() !== a ||
    data.getUTCMonth() !== m - 1 ||
    data.getUTCDate() !== d
  ) {
    throw new RangeError(`data civil invalida: ${iso}`)
  }
  return data
}

export function paraISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function somaDias(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DIA_MS)
}

export function somaMeses(d: Date, n: number): Date {
  const r = new Date(d.getTime())
  const diaOriginal = r.getUTCDate()
  r.setUTCMonth(r.getUTCMonth() + n)
  // 31/01 + 1 mes nao pode virar 03/03: trava no ultimo dia do mes alvo
  if (r.getUTCDate() < diaOriginal) r.setUTCDate(0)
  return r
}

export function ehFimDeSemana(d: Date): boolean {
  const dow = d.getUTCDay()
  return dow === 0 || dow === 6
}

export function ehUtil(d: Date, feriados: Set<string>): boolean {
  return !ehFimDeSemana(d) && !feriados.has(paraISO(d))
}

/** Soma n dias uteis, pulando fim de semana e feriado. */
export function somaDiasUteis(d: Date, n: number, feriados: Set<string>): Date {
  const passo = n >= 0 ? 1 : -1
  let restam = Math.abs(n)
  let atual = new Date(d.getTime())
  while (restam > 0) {
    atual = somaDias(atual, passo)
    if (ehUtil(atual, feriados)) restam--
  }
  return atual
}

/**
 * Regra de borda. Prazo que conta PARA TRAS e antecipa quando cai em dia nao
 * util: postergar seria perder o prazo. Prazo que conta para frente posterga.
 */
export function ajustaBorda(
  d: Date,
  sentido: 'antes' | 'depois',
  feriados: Set<string>,
): Date {
  const passo = sentido === 'antes' ? -1 : 1
  let atual = new Date(d.getTime())
  let guarda = 0
  while (!ehUtil(atual, feriados) && guarda++ < 30) {
    atual = somaDias(atual, passo)
  }
  return atual
}

// ─────────────────────── resolucao de prazo ───────────────────────

export type Ancoras = Partial<Record<Ancora, string | null>> & {
  /** Ancoras nomeadas, para quando ha mais de uma do mesmo tipo. */
  nomeadas?: Record<string, string | null>
}

export type DataResolvida = {
  /** null quando a ancora ainda nao e conhecida. */
  data: string | null
  /** Teto da faixa, quando o prazo e intervalo ("de 90 ate 120 dias"). */
  data_ate: string | null
  pendencia: { motivo: 'ancora_desconhecida'; depende_de: Ancora } | null
}

/**
 * Aplica um PrazoRelativo sobre as ancoras conhecidas.
 *
 * Nao inventa data: ancora ausente devolve pendencia, que e o que alimenta a
 * fila humana. E o caso do contrato B, onde nove obrigacoes dependem de uma
 * data do evento que nao consta no documento.
 */
export function resolvePrazo(
  prazo: PrazoRelativo,
  ancoras: Ancoras,
  feriados: Set<string>,
  opcoes: { ajustarBorda?: boolean } = {},
): DataResolvida {
  const base = prazo.ancora_ref
    ? ancoras.nomeadas?.[prazo.ancora_ref] ?? null
    : ancoras[prazo.ancora] ?? null

  if (!base) {
    return {
      data: null,
      data_ate: null,
      pendencia: { motivo: 'ancora_desconhecida', depende_de: prazo.ancora },
    }
  }

  const calcula = (quantidade: number): string => {
    const sinal = prazo.sentido === 'antes' ? -1 : 1
    const inicio = deISO(base)
    let fim: Date

    if (prazo.unidade === 'meses') {
      fim = somaMeses(inicio, sinal * quantidade)
    } else if (prazo.unidade === 'horas') {
      // "48 horas antes" nao pode virar "2 dias antes" por arredondamento: a
      // conta e em horas e so depois vira data civil.
      fim = new Date(inicio.getTime() + sinal * quantidade * 3_600_000)
    } else if (prazo.base === 'uteis') {
      fim = somaDiasUteis(inicio, sinal * quantidade, feriados)
    } else {
      fim = somaDias(inicio, sinal * quantidade)
    }

    // dia util nao se reajusta em prazo ja contado em dias uteis
    const precisaAjuste =
      opcoes.ajustarBorda !== false && prazo.base !== 'uteis' && prazo.unidade !== 'horas'
    if (precisaAjuste) fim = ajustaBorda(fim, prazo.sentido, feriados)
    return paraISO(fim)
  }

  const data = calcula(prazo.quantidade)
  const ate = prazo.quantidade_ate ? calcula(prazo.quantidade_ate) : null
  // "De 90 a 120 dias ANTES" conta pra tras: o teto da faixa cai antes do
  // piso. A faixa sai sempre em ordem cronologica, qualquer que seja o sentido.
  const invertida = ate !== null && data > ate
  return {
    data: invertida ? ate : data,
    data_ate: invertida ? data : ate,
    pendencia: null,
  }
}

// ─────────────────────── auditoria de coerencia ───────────────────────

/**
 * Compara a regra do contrato com a data escrita a mao no mesmo contrato.
 *
 * O saldo do contrato A aparece duas vezes: como regra ("ate 07 dias antes do
 * evento") e como data absoluta preenchida por quem montou o documento. Quando
 * divergem, quem preencheu errou a conta, e isso acontece o tempo todo.
 *
 * A data ESCRITA prevalece, porque foi o que as partes assinaram. A divergencia
 * vira aviso, nao correcao silenciosa.
 */
export function auditaCoerencia(
  peloCalculo: string | null,
  escritaNoPapel: string | null,
): string | null {
  if (!peloCalculo || !escritaNoPapel || peloCalculo === escritaNoPapel) return null
  const dias = Math.round(
    (deISO(escritaNoPapel).getTime() - deISO(peloCalculo).getTime()) / DIA_MS,
  )
  const lado = dias > 0 ? 'depois' : 'antes'
  return (
    `A regra do contrato resulta em ${peloCalculo}, mas o documento escreve ` +
    `${escritaNoPapel}, ${Math.abs(dias)} dia(s) ${lado}. Vale a data escrita, ` +
    `que foi a assinada. Confira com a outra parte.`
  )
}

/**
 * Confere se o valor da parcela bate com o percentual declarado sobre o total.
 * Tolerancia padrao de 1 centavo: e conferencia de aritmetica, nao de
 * arredondamento de planilha. Quem precisar de folga maior passa explicito.
 */
export function auditaAritmetica(
  total: number | null,
  percentual: number | null,
  valorParcela: number | null,
  toleranciaCentavos = 1,
): string | null {
  if (total == null || percentual == null || valorParcela == null) return null
  const esperado = new Decimal(total).mul(percentual).div(100)
  const diff = esperado.minus(valorParcela).abs()
  if (diff.lessThanOrEqualTo(new Decimal(toleranciaCentavos).div(100))) return null
  return (
    `${percentual}% de ${total.toFixed(2)} da ${esperado.toFixed(2)}, mas o ` +
    `contrato escreve ${valorParcela.toFixed(2)}.`
  )
}

// ─────────────────────────── mora ───────────────────────────

export type Mora = {
  principal: number
  multa: number
  juros: number
  total: number
  diasAtraso: number
}

/**
 * Multa fixa sobre o principal mais juros pro rata die.
 *
 * "Multa moratoria de 2%, juros de mora de 1% ao mes, pro rata die" e o texto
 * dos contratos A e B. Pro rata die significa que a fracao do mes conta por
 * dia, entao o valor devido muda todo dia, e o alerta pode dizer quanto e hoje.
 *
 * Decimal, nunca float: dinheiro em ponto flutuante acumula erro de centavo.
 */
export function calculaMora(
  principal: number,
  vencimento: string,
  hoje: string,
  regra: { multaPercentual: number; jurosMensalPercentual: number; proRataDie: boolean },
): Mora {
  const dias = Math.floor(
    (deISO(hoje).getTime() - deISO(vencimento).getTime()) / DIA_MS,
  )
  if (dias <= 0) {
    return { principal, multa: 0, juros: 0, total: principal, diasAtraso: 0 }
  }
  const p = new Decimal(principal)
  const multa = p.mul(regra.multaPercentual).div(100)
  const meses = regra.proRataDie
    ? new Decimal(dias).div(30)
    : new Decimal(Math.ceil(dias / 30))
  const juros = p.mul(regra.jurosMensalPercentual).div(100).mul(meses)
  const arred = (d: Decimal) => Number(d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP))
  // O total soma os componentes JA arredondados: e o que o e-mail imprime
  // linha a linha, e um dl que nao fecha por um centavo mina a confianca.
  const multaArred = arred(multa)
  const jurosArred = arred(juros)
  return {
    principal,
    multa: multaArred,
    juros: jurosArred,
    total: Number(
      new Decimal(principal).plus(multaArred).plus(jurosArred).toDecimalPlaces(2),
    ),
    diasAtraso: dias,
  }
}

/**
 * Reajuste acumulado por PRODUTORIO, nunca soma.
 *
 * Somar os percentuais mensais e o erro classico e superestima. Em doze meses
 * de IPCA a 0,4% ao mes a diferenca ja aparece na segunda casa.
 */
export function reajusteAcumulado(percentuaisMensais: number[]): number {
  const fator = percentuaisMensais.reduce(
    (acc, i) => acc.mul(new Decimal(1).plus(new Decimal(i).div(100))),
    new Decimal(1),
  )
  return Number(fator.minus(1).mul(100).toDecimalPlaces(4, Decimal.ROUND_HALF_UP))
}
