/**
 * Contrato de dados entre as quatro frentes. Congelado no passo 0.
 *
 * Derivado da estrutura real de tres contratos, nao de um modelo generico.
 * Cada decisao aqui existe porque um dos tres contratos quebrou a versao
 * anterior.
 *
 * Regras que o tipo impoe:
 *  1. Nenhum campo sem evidencia. Nao da para escrever um valor solto.
 *  2. O modelo nunca devolve data calculada, so a regra de como calcular.
 *  3. Ausencia e valor valido, e ambiguidade e diferente de ausencia.
 *  4. Confianca e por campo, nunca por documento.
 */
import { z } from 'zod'

// ─────────────────────────── evidencia ───────────────────────────

/**
 * O identificador da clausula NAO tem formato fixo. Os tres contratos usam
 * tres esquemas: decimal multinivel ("1.4.2.2"), sequencial plano com
 * sub-letras ("13.", "a.") e ordinal por extenso ("Clausula 1a", "Paragrafo
 * Unico"). No contrato B o rotulo nem e unico no documento: existem varios
 * itens "a." em clausulas diferentes. Por isso a referencia e sempre o caminho
 * completo mais a pagina, nunca so o numero.
 */
export const Evidencia = z.object({
  citacao: z.string().min(10)
    .describe('Trecho LITERAL do contrato, copiado sem parafrasear'),
  pagina: z.number().int().positive(),
  clausula: z.string().nullable()
    .describe('Clausula-pai como aparece no documento, ex: "CLÁUSULA QUARTA"'),
  item: z.string().nullable()
    .describe('Rotulo do item dentro da clausula, ex: "3.1.2", "b.", "vii."'),
  confianca: z.number().min(0).max(1),
})
export type Evidencia = z.infer<typeof Evidencia>

/**
 * Por que o campo nao foi extraido. Os tres motivos exigem perguntas
 * diferentes na fila humana, entao sao tipos distintos e nao um booleano.
 */
export const MotivoPendencia = z.enum([
  'ausente',      // contrato B: a data do evento nao existe no documento
  'ambiguo',      // contrato C: "no mes do evento", sabe-se o mes, nao o dia
  'indeterminado', // contrato C: "definido entre as partes por escrito"
  'baixa_confianca', // extraiu, mas a citacao nao bateu com a pagina
])
export type MotivoPendencia = z.infer<typeof MotivoPendencia>

/**
 * Valor + evidencia. As duas invariantes que alimentam a fila humana sao
 * MECANICAS, nao comentario: valor null exige motivo (senao o campo some da
 * fila em silencio) e valor presente exige evidencia (regra 1 do arquivo).
 */
const comEvidencia = <T extends z.ZodTypeAny>(valor: T) =>
  z.object({
    valor: valor.nullable(),
    motivo: MotivoPendencia.nullable(),
    detalhe_pendencia: z.string().nullable()
      .describe('O que perguntar ao humano. Ex: "o contrato diz \'no mês do evento\'. Que dia?"'),
    evidencia: Evidencia.nullable(),
  }).superRefine((bruto, ctx) => {
    // o generico T colapsa a inferencia do zod aqui; o formato e conhecido
    const c = bruto as unknown as {
      valor: unknown
      motivo: unknown
      evidencia: unknown
    }
    if (c.valor === null && c.motivo === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['motivo'],
        message: 'valor null exige motivo (ausente, ambiguo, indeterminado ou baixa_confianca)',
      })
    }
    if (c.valor !== null && c.evidencia === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['evidencia'],
        message: 'valor presente exige evidencia com citacao e pagina',
      })
    }
  })

// ─────────────────────── prazo relativo: o coracao ───────────────────────

/**
 * Ancoras possiveis. `evento_secundario` existe por causa do contrato C, que
 * obriga a remarcar o ensaio em caso de chuva mas nunca diz a data do ensaio.
 * Um contrato pode ter mais de uma ancora pendente.
 */
export const Ancora = z.enum([
  'evento',
  'evento_secundario',
  'assinatura',
  'parcela',
  'entrega',
  'uso',
])
export type Ancora = z.infer<typeof Ancora>

export const PrazoRelativo = z.object({
  ancora: Ancora,
  ancora_ref: z.string().nullable()
    .describe('Qual ancora, quando ha mais de uma. Ex: "ensaio", "entrada"'),
  sentido: z.enum(['antes', 'depois']),
  /**
   * Inteiro e nao-negativo: offset ZERO existe ("50% na assinatura", C03) e
   * fracao de dia nao existe em prazo contratual; somaDiasUteis arredondaria
   * uma fracao pra cima em silencio.
   */
  quantidade: z.number().int().nonnegative(),

  /**
   * Faixa. O contrato C entrega "no prazo de ate 90 ate 120 dias a contar da
   * data do evento": nao e uma data, e um intervalo. null quando o prazo e um
   * ponto so, que e o caso de A e B.
   */
  quantidade_ate: z.number().int().positive().nullable(),

  /**
   * Horas importa. Duas obrigacoes de maior valor sao "48 horas antes do
   * evento". Truncar para dias erra o alerta em um dia inteiro, justamente
   * onde um dia decide se o profissional viaja ou nao.
   */
  unidade: z.enum(['horas', 'dias', 'meses']),
  base: z.enum(['corridos', 'uteis']).default('corridos'),

  /**
   * Condicao que ativa o prazo, em texto. Avaliada pelo cron no dia, nunca na
   * extracao. Ex: "houver parcela em aberto", "chuva no dia do ensaio",
   * "o contratado informar o prazo adicional". null = incondicional.
   */
  condicao: z.string().nullable(),

  /** Condicao que nao se realiza mais, como a clausula de COVID do contrato C. */
  condicao_morta: z.boolean().default(false),
})
export type PrazoRelativo = z.infer<typeof PrazoRelativo>

// ─────────────────────────── partes ───────────────────────────

export const Papel = z.enum(['contratante', 'contratado', 'terceiro'])
export type Papel = z.infer<typeof Papel>

export const Parte = z.object({
  papel: Papel,
  nome: z.string(),
  documento: z.string().nullable(),
  /**
   * Quem e o usuario neste contrato. O mesmo profissional aparece como
   * contratado em dois contratos e como contratante num terceiro, e o produto
   * serve os dois casos com o mesmo motor.
   */
  eh_o_usuario: z.boolean().default(false),
})

// ─────────────────────── o que sai da extracao ───────────────────────

export const ContratoExtraido = z.object({
  tipo: z.enum([
    'servico_evento_presencial',
    'criacao_estudio',
    'filmagem_evento',
    'outro',
  ]),

  partes: z.array(Parte),

  evento: z.object({
    data: comEvidencia(z.string().describe('data como escrita, ex: "12 de dezembro de 2026"')),
    /** O contrato C nao tem horario. A e B tem. Ausencia e normal. */
    hora_inicio: comEvidencia(z.string()),
    hora_termino: comEvidencia(z.string()),
    termino_no_dia_seguinte: z.boolean().default(false)
      .describe('true quando o termino e menor que o inicio, ex: 19:00 as 05:00'),
    local: comEvidencia(z.string()),
  }),

  /** Ensaio, prova, reuniao de alinhamento. Cada um pode ter data propria ou nao. */
  eventos_secundarios: z.array(z.object({
    nome: z.string(),
    data: comEvidencia(z.string()),
  })).default([]),

  valores: z.object({
    total: comEvidencia(z.number()),
    desconto: comEvidencia(z.number()),
    /** Permite conferir o algarismo contra o extenso, que e como o valor real
     *  do contrato B foi recuperado. */
    total_por_extenso: comEvidencia(z.string()),
  }),

  parcelas: z.array(z.object({
    ordem: z.number().int().positive(),
    percentual: comEvidencia(z.number()),
    valor: comEvidencia(z.number()),
    /** Uma parcela pode ter data escrita, regra relativa, ou as duas. As duas
     *  juntas permitem auditoria de coerencia. */
    data_escrita: comEvidencia(z.string()),
    prazo_relativo: comEvidencia(PrazoRelativo),
  })),

  obrigacoes_prazo: z.array(z.object({
    descricao: z.string(),
    /** "terceiro" e o caso do pixelmap: devido pelo fornecedor tecnico de LED,
     *  que nao assinou o contrato. O alerta vai para quem tem que cobrar. */
    devedor: Papel,
    devedor_detalhe: z.string().nullable(),
    prazo: comEvidencia(PrazoRelativo),
    consequencia: comEvidencia(z.string()),
  })),

  cancelamento: z.array(z.object({
    limite_inferior: comEvidencia(PrazoRelativo),
    limite_superior: comEvidencia(PrazoRelativo).nullable(),
    percentual_devido: comEvidencia(z.number()),
  })),

  /**
   * Nem todo contrato escalona por data. O contrato C devolve 30% do valor pago
   * em qualquer momento. Isso e informacao de negocio, nao ausencia dela: o
   * alerta deve dizer "nao existe data melhor para cancelar neste contrato".
   */
  rescisao_sem_escalonamento: comEvidencia(z.object({
    percentual_devolucao: z.number(),
    base: z.enum(['valor_pago', 'valor_total']),
  })).nullable(),

  /** Ausente por inteiro no contrato C. Nao inventar. */
  mora: z.object({
    multa_percentual: comEvidencia(z.number()),
    juros_mensal_percentual: comEvidencia(z.number()),
    pro_rata_die: z.boolean().default(false),
    indice_correcao: comEvidencia(z.enum(['IPCA', 'IGPM', 'outro'])),
  }),

  rescisao: z.array(z.object({
    gatilho: z.string(),
    prazo: comEvidencia(PrazoRelativo),
    efeito: comEvidencia(z.string()),
  })),

  /** Sem data: limite mais preco do excedente. Receita que vaza por falta de contagem. */
  contadores: z.array(z.object({
    descricao: z.string(),
    limite_incluso: comEvidencia(z.number()),
    unidade: z.enum(['alteracoes', 'horas', 'unidades']),
    valor_excedente: comEvidencia(z.number()),
    escopo: z.string().describe('a que se aplica, ex: "por arte", "no total do contrato"'),
  })),
})
export type ContratoExtraido = z.infer<typeof ContratoExtraido>

// ─────────────────── saida do motor de datas ───────────────────

export const TipoData = z.enum([
  'evento',
  'evento_secundario',
  'assinatura',
  'parcela',
  'saldo_pre_evento',
  'entrega_material',
  'fronteira_cancelamento',
  'gatilho_rescisao',
  'decisao_comparecimento',
  'entrega_pos_contrato',
  'janela_alteracoes',
  'disponibilidade_arquivo',
  'vencimento_documento',
])
export type TipoData = z.infer<typeof TipoData>

export type KeyDate = {
  id: string
  contract_id: string
  obligation_id: string | null
  kind: TipoData

  /** Resolvida em America/Sao_Paulo. null enquanto a ancora nao for conhecida. */
  due_date: string | null
  /** Faixa: contrato C entrega entre evento+90 e evento+120. */
  due_date_max: string | null

  amount_cents: number | null
  devedor: Papel
  devedor_detalhe: string | null

  /** Avaliada pelo cron no dia, nao na extracao. */
  condicao: string | null

  origem: {
    ancora: Ancora
    ancora_ref: string | null
    offset: number
    offset_ate: number | null
    unidade: 'horas' | 'dias' | 'meses'
    base: 'corridos' | 'uteis'
  } | null

  /**
   * Preenchido quando a regra e a data escrita no papel divergem. A data
   * escrita prevalece, porque foi o que as partes assinaram, e a divergencia
   * entra no alerta como aviso. Ver a divergencia intencional do contrato A.
   */
  divergencia: string | null

  /** Por que ainda nao tem data. Alimenta a fila humana. */
  pendencia: { motivo: MotivoPendencia; detalhe: string; depende_de: string | null } | null

  status: 'ativa' | 'cumprida' | 'superseded' | 'pendente'
}

/**
 * Assinatura do motor. Funcao PURA: nao le relogio por dentro, nao faz IO.
 * E o unico bloco do projeto que precisa de teste unitario, e precisa mesmo.
 */
export type CalcularDatas = (
  contrato: ContratoExtraido,
  hoje: Date,
  feriados: Date[],
) => KeyDate[]

// ─────────────────── divisao das chamadas ao modelo ───────────────────

/** Quatro chamadas focadas em paralelo rendem mais que uma gigante. */
export const FAMILIAS = {
  'partes-e-evento': ['partes', 'evento', 'eventos_secundarios'],
  'financeiro': ['valores', 'parcelas', 'mora'],
  'saida': ['cancelamento', 'rescisao', 'rescisao_sem_escalonamento'],
  'operacional': ['obrigacoes_prazo', 'contadores'],
} as const
export type Familia = keyof typeof FAMILIAS
