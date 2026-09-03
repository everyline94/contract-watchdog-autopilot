# Contratos preenchidos para a demo

**Tudo aqui é fictício.** Os contratos A e B foram gerados a partir de modelos
reais de um profissional: nomes, CPF, CNPJ, endereços, contas e chave PIX foram
inventados. Os CPF e CNPJ têm o formato realista para a extração ler, mas o
dígito verificador é propositalmente inválido: nenhum deles pode coincidir com
o documento de uma pessoa real.

| Arquivo | Págs | Papel na demo |
|---|---|---|
| `CONTRATO-A-VJ-Motion-Albuquerque-2026.pdf` | 9 | Caso completo. Tem data de evento, então o motor calcula tudo |
| `CONTRATO-B-Criacao-Video-Alecrim-2026.pdf` | 8 | Caso da fila humana. **Não tem data de evento** |
| `CONTRATO-C-Filmagem-Casamento-2026.pdf` | 3 | O usuário no papel de **contratante**. Contrato encerrado, prazo em faixa, cláusula morta |
| `GABARITO.json` | json | As 47 obrigações esperadas, com cláusula, página e citação |

O contrato C veio de outra fonte: um PDF real, de outro profissional, com
assinatura manuscrita e dados reais. Ele foi anonimizado antes de entrar aqui:
nomes, documentos, endereços, e também data, cidade e tipo do evento foram
trocados, e a assinatura foi removida.

**O que ele testa e A/B não testam:** prazo em faixa (entrega entre 90 e 120
dias), data derivada de data derivada, ambiguidade que não é ausência ("no mês
do evento"), âncora ausente para evento secundário (o ensaio), ausência total de
mora e de faixas de cancelamento, e cláusula com condição morta (COVID).

---

## O que cada contrato exercita

### Contrato A, VJ presencial

- **Evento:** 12/12/2026 (sábado), das 19:00 às 05:00 do dia 13
- **Valor:** R$ 8.900,00 com desconto de R$ 600,00, líquido de R$ 8.300,00
- **Entrada:** R$ 2.490,00 (30%) vencida em 14/08/2026
- **Saldo:** R$ 5.810,00 (70%)

Datas derivadas que o motor precisa produzir:

| Obrigação | Regra | Resultado |
|---|---|---|
| Fronteira de cancelamento 30% | evento - 60d | 13/10/2026 |
| Materiais, pixelmap, contato técnico e fronteira 50% | evento - 30d | 12/11/2026 |
| Saldo, pela regra da cláusula 3.1 | evento - 7d | 05/12/2026 (sábado) |
| Decisão de comparecer e aviso de mudança de local | evento - 48h | 10/12/2026 |

Três coisas ficam sob teste aqui:

1. **Divergência intencional.** A cláusula 3.1 diz *"o restante até 07 dias antes
   do evento"*, o que dá 05/12/2026. Mas o item 3.1.ii escreve *"até 08 de
   dezembro de 2026"*. **Isso está errado de propósito.** É quem preencheu o
   modelo que errou a conta, e acontece o tempo todo na vida real. O motor deve
   sinalizar a divergência, manter a data escrita como vigente (foi o que as
   partes assinaram) e alertar nas duas.
2. **Regra de borda.** 05/12/2026 cai num sábado. Prazo que conta para trás
   antecipa, então o alerta útil é sexta, 04/12.
3. **Obrigação de terceiro.** O pixelmap é devido pelo fornecedor técnico de LED,
   que não assinou este contrato. O alerta vai para a contratante cobrar o
   terceiro, não para o terceiro.

### Contrato B, criação de vídeo em estúdio

- **Valor:** R$ 3.290,00 (a aritmética fecha: 987 é 30%, 2.303 é 70%)
- **Entrada:** R$ 987,00 vencendo em 05/09/2026
- **Saldo:** R$ 2.303,00, **sem data absoluta**, só a regra "até 07 dias antes do
  evento"

**Este contrato tem exatamente uma data no documento inteiro: 05/09/2026.**

Não tem data de evento, e não tem porque o modelo original não tem mesmo: a
cláusula 7 diz que a contratante vai informar data, local e tipo com 30 dias de
antecedência. É circular, e é real.

Resultado esperado na ingestão: nove das treze obrigações ficam **pendentes**, e
o sistema abre um item na fila humana em vez de chutar. Quando alguém responde a
data, oito aparecem de uma vez, e uma continua na fila porque o motivo dela é
outro (cronograma indeterminado). É a prova do critério de autonomia com
incerteza sinalizada.

Também exercita:

- **Cronograma indeterminado.** *"O cronograma de entrega de primeiras versões
  será definido entre as partes por escrito."* Não há prazo a extrair. Vai para
  a fila com motivo próprio.
- **Duplicata real.** Os itens 11 e 12 são o mesmo parágrafo repetido. Está no
  modelo original. Bom teste de deduplicação.

---

## O achado que muda a citação

Os dois contratos são do mesmo profissional e **usam esquemas de numeração
diferentes**:

- **Contrato A:** decimal multinível. `1.4.2.2`, `3.1`, com sub-itens romanos
- **Contrato B:** sequencial plano que corre através das cláusulas. `7.`, `13.`,
  `14.`, com sub-itens `a.`, `b.`, `c.`

No contrato B o rótulo **não é único no documento**: existem vários itens `a.`
em cláusulas diferentes. Citar "cláusula a." não identifica nada.

Por isso a citação no `GABARITO.json` é sempre um caminho completo:

```
{ "clausula": "CLÁUSULA QUARTA", "item": "b.", "pagina": 3, "citacao": "..." }
```

E é por isso que a evidência exige os quatro campos juntos, não só o número.

---

## Uma lição que vale para o extrator

O Word usa espaço não-quebrável (`\xa0`) no meio das frases, e ele sobrevive à
conversão para PDF. Sem normalizar, toda comparação literal falha. O verificador
de citação normaliza antes de comparar por causa disso.
