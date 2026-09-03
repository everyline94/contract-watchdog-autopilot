# Schema de extração

Derivado da estrutura real dos dois contratos mapeados, não de um modelo
genérico de contrato. Este é o artefato do passo 0: congelar isto antes de
qualquer código, e as quatro frentes ficam independentes.

---

## Princípios que o schema impõe

1. **Nenhum campo sem evidência.** `Evidencia` é obrigatória em tudo. O tipo não
   permite um valor solto.
2. **O modelo nunca devolve data calculada.** Prazo relativo sai como
   `{ancora, offset, unidade, sentido}`. Data absoluta só quando está escrita
   no papel, e sai como string bruta para o código parsear.
3. **Ausência é um valor válido.** `null` com motivo é resposta legítima e
   manda o item para a fila humana. É como o contrato B, sem data de evento,
   entra no sistema sem quebrar nada.
4. **Confiança é por campo.** Vigência clara e reajuste ambíguo no mesmo
   documento é o caso normal, não a exceção.

---

## types.ts

```ts
import { z } from 'zod'

// ---------- evidência ----------

export const Evidencia = z.object({
  citacao: z.string().min(10)
    .describe('Trecho LITERAL do contrato, copiado sem parafrasear'),
  pagina: z.number().int().positive(),
  clausula: z.string().nullable()
    .describe('Identificador da cláusula como aparece no PDF, ex: "3.1.2". null se não numerada'),
  confianca: z.number().min(0).max(1),
})

// Campo com valor + evidência. Valor null significa "não encontrado no contrato"
// e exige motivo. É assim que a fila humana é alimentada.
const comEvidencia = <T extends z.ZodTypeAny>(valor: T) =>
  z.object({
    valor: valor.nullable(),
    motivo_ausencia: z.string().nullable()
      .describe('Preenchido apenas quando valor é null. Ex: "data do evento não consta no documento"'),
    evidencia: Evidencia.nullable(),
  })

// ---------- prazo relativo: o coração ----------

export const Ancora = z.enum([
  'evento',        // data do evento
  'assinatura',    // data de assinatura
  'parcela',       // data de vencimento de uma parcela específica
  'entrega',       // data de entrega efetiva
  'uso',           // data em que o material será usado
])

export const PrazoRelativo = z.object({
  ancora: Ancora,
  sentido: z.enum(['antes', 'depois']),
  quantidade: z.number().positive(),
  unidade: z.enum(['horas', 'dias', 'meses']),
  base: z.enum(['corridos', 'uteis']).default('corridos'),
  condicao: z.string().nullable()
    .describe('Condição que ativa o prazo. Ex: "houver parcela em aberto". null = incondicional'),
})

// ---------- partes ----------

export const Parte = z.object({
  papel: z.enum(['contratante', 'contratado', 'terceiro']),
  nome: z.string(),
  documento: z.string().nullable(),   // CPF ou CNPJ
})

// ---------- o que sai da extração ----------

export const ContratoExtraido = z.object({

  tipo: z.enum(['servico_evento_presencial', 'criacao_estudio', 'outro']),

  partes: z.array(Parte),

  // A âncora. Pode não existir: contrato B não tem.
  evento: z.object({
    data: comEvidencia(z.string().describe('data como escrita, ex: "12 de dezembro de 2026"')),
    hora_inicio: comEvidencia(z.string()),
    hora_termino: comEvidencia(z.string()),
    termino_no_dia_seguinte: z.boolean()
      .describe('true quando o término é menor que o início, ex: início 20:00, término 05:00'),
    local: comEvidencia(z.string()),
  }),

  valores: z.object({
    total: comEvidencia(z.number()),
    desconto: comEvidencia(z.number()),
    // extenso capturado à parte permite conferir contra o algarismo
    total_por_extenso: comEvidencia(z.string()),
  }),

  parcelas: z.array(z.object({
    ordem: z.number().int().positive(),
    percentual: comEvidencia(z.number()),
    valor: comEvidencia(z.number()),
    // Uma parcela pode ter data escrita, regra relativa, ou as duas.
    // As duas juntas é o caso do saldo: permite auditoria de coerência.
    data_escrita: comEvidencia(z.string()),
    prazo_relativo: comEvidencia(PrazoRelativo),
  })),

  // Obrigações do contratante que não são pagamento
  obrigacoes_prazo: z.array(z.object({
    descricao: z.string(),
    devedor: z.enum(['contratante', 'contratado', 'terceiro'])
      .describe('Quem executa. "terceiro" é o caso do pixelmap, devido pelo fornecedor técnico'),
    devedor_detalhe: z.string().nullable(),
    prazo: comEvidencia(PrazoRelativo),
    consequencia: comEvidencia(z.string()),
  })),

  cancelamento: z.array(z.object({
    limite_inferior: comEvidencia(PrazoRelativo).describe('início da faixa, ex: 60 dias antes'),
    limite_superior: comEvidencia(PrazoRelativo).nullable().describe('null quando a faixa é aberta'),
    percentual_devido: comEvidencia(z.number()),
  })),

  mora: z.object({
    multa_percentual: comEvidencia(z.number()),
    juros_mensal_percentual: comEvidencia(z.number()),
    pro_rata_die: z.boolean(),
    indice_correcao: comEvidencia(z.enum(['IPCA', 'IGPM', 'outro'])),
  }),

  rescisao: z.array(z.object({
    gatilho: z.string(),
    prazo: comEvidencia(PrazoRelativo),
    efeito: comEvidencia(z.string()),
  })),

  // Não têm data. São limite + preço do excedente.
  contadores: z.array(z.object({
    descricao: z.string(),
    limite_incluso: comEvidencia(z.number()),
    unidade: z.enum(['alteracoes', 'horas', 'unidades']),
    valor_excedente: comEvidencia(z.number()),
    escopo: z.string().describe('a que se aplica, ex: "por arte", "no total do contrato"'),
  })),
})

export type ContratoExtraido = z.infer<typeof ContratoExtraido>
```

---

## Como os contratos reais mapeiam neste schema

Prova de que o schema cobre o que existe, sem campo sobrando nem faltando.

| Trecho real | Vai para | Vira |
|---|---|---|
| "30% no momento da contratação" | `parcelas[0]` | percentual 30, data escrita |
| "o restante até 07 dias antes do evento" | `parcelas[1].prazo_relativo` | `{evento, antes, 7, dias}` |
| "R$ xxx (novecentos e oitenta e sete reais)" | `parcelas[0].valor` + `total_por_extenso` | 987, conferível contra 30% do total |
| "antecedência mínima de 30 dias da data do evento" (materiais) | `obrigacoes_prazo[]` | devedor contratante |
| "fornecedor técnico envie o pixelmap em 30 dias antes" | `obrigacoes_prazo[]` | **devedor terceiro** |
| "superior a 60 dias: 30%" | `cancelamento[0]` | limite inferior 60d antes, 30% |
| "entre 59 e 30 dias: 50%" | `cancelamento[1]` | faixa fechada |
| "inferior a 30 dias: valor total" | `cancelamento[2]` | faixa aberta, 100% |
| "atraso persista até 48 horas antes da data do evento" | `rescisao[]` | `{evento, antes, 48, horas, condicao: "parcela em aberto"}` |
| "multa de 2%, juros de 1% ao mês pro rata die, IPCA" | `mora` | inteiro |
| "até 2 alterações simples, adicionais R$ 200" | `contadores[]` | limite 2, excedente 200, por arte |
| "R$ 200 por hora excedente" | `contadores[]` | limite 0, excedente 200, por hora |
| "3 horas de consultoria" | `contadores[]` | limite 3, unidade horas |
| Contrato B sem data de evento | `evento.data.valor = null` | `motivo_ausencia` preenchido, vai para a fila |
| "cronograma definido entre as partes por escrito" | `obrigacoes_prazo[].prazo.valor = null` | fila humana |
| "início XX:00, término 05:00 do dia seguinte" | `termino_no_dia_seguinte = true` | motor não erra a duração |

---

## Saída do motor de datas

O que o código determinístico produz a partir do que está acima. Nenhuma IA
toca nisto.

```ts
export type KeyDate = {
  id: string
  contract_id: string
  obligation_id: string | null
  kind:
    | 'evento'
    | 'parcela'
    | 'saldo_pre_evento'
    | 'entrega_material'          // materiais, pixelmap, contato técnico
    | 'fronteira_cancelamento'
    | 'gatilho_rescisao'
    | 'decisao_comparecimento'    // condicional
    | 'entrega_pos_contrato'
  due_date: string                // ISO, America/Sao_Paulo resolvido
  amount_cents: number | null
  devedor: 'contratante' | 'contratado' | 'terceiro'
  devedor_detalhe: string | null
  condicao: string | null         // null = sempre dispara
  origem: { ancora: string; offset: number; unidade: string } | null
  divergencia: string | null      // preenchido quando a regra e a data escrita não batem
  status: 'ativa' | 'cumprida' | 'superseded'
}

// Assinatura do motor. Puro. Não lê relógio por dentro.
export function calcularDatas(
  contrato: ContratoExtraido,
  hoje: Date,
  feriados: Date[],
): KeyDate[]
```

O campo `divergencia` é o achado 3 virando código: quando a parcela tem data
escrita **e** prazo relativo, o motor calcula os dois e compara. Diferente, a
data escrita prevalece (foi o que as partes assinaram) e a divergência entra no
alerta como aviso.

---

## Estratégia de chamada ao modelo

Quatro chamadas em paralelo, uma por família. Cada uma recebe o texto paginado
inteiro mas só o pedaço do schema que lhe cabe:

| Chamada | Preenche |
|---|---|
| `partes-e-evento` | partes, evento, local |
| `financeiro` | valores, parcelas, mora |
| `saida` | cancelamento, rescisao |
| `operacional` | obrigacoes_prazo, contadores |

Quatro chamadas focadas rendem mais que uma gigante, rodam em paralelo, e uma
falha não derruba o resto.

**Verificação depois de cada chamada, em código:** para cada `Evidencia`,
conferir se `citacao` aparece literalmente no texto da página `pagina`
(normalizando espaço e acento). Não aparece, `confianca = 0` e o campo vai para
a fila humana. Isto mata alucinação de forma mecânica, sem depender do modelo
se comportar.
