# Contract Watchdog Autopilot

Construído por Bruno Lujan Larocca, Maria Eduarda, Fabio e
Marcelo Vieira da Silva em dois dias no hackathon Aton Praxis, tema 29.
O produto se chama Revelio.

O produto lê o contrato, calcula as datas que ninguém calculou, e cobra sozinho.

---

## O problema, medido

Três contratos de fornecedor de evento, lidos obrigação por obrigação. Dois
foram gerados de modelos reais e um veio de um contrato real anonimizado. O
resultado está em `contratos/preenchidos/GABARITO.json`:

| | |
|---|---|
| Obrigações com consequência financeira | **47** |
| Destas, datas | 37 |
| Datas **escritas** no contrato | 6 |
| Datas que precisam ser **calculadas** | 27 |
| Datas que **não existem** até alguém preencher | 4 |

**Oitenta e quatro por cento das datas que importam não estão escritas em lugar
nenhum.** É por isso que planilha e lembrete não resolvem: eles guardam datas, e
aqui o que existe são regras. "O saldo é pago até sete dias antes do evento" não
é uma data, é uma conta que alguém precisa lembrar de fazer.

Um dos três contratos tem **uma única data em oito páginas**. Nove das treze
obrigações dele dependem de uma data do evento que não consta no documento.

---

## A tese

**O modelo lê. O código calcula.**

O LLM extrai a regra com a citação literal e a página, e devolve
`{ancora: "evento", sentido: "antes", quantidade: 7, unidade: "dias"}`. Quem
transforma isso em `2026-12-05` é uma função pura com teste unitário.

Duas consequências:

1. O sistema não tem como alucinar uma data no calendário de um cliente.
2. Toda citação é conferida contra o texto da página que o modelo informou. Se
   não bater, a confiança vai a zero e o campo vai para a fila humana, em vez de
   entrar no calendário como se fosse verdade.

---

## O que tem aqui

| Rota | O que é |
|---|---|
| `/` | Demo guiada em seis passos. Roda sem modelo: usa o gabarito e o motor de datas |
| `/app` | O produto: painel, upload com fila, ficha do contrato com cláusulas e agenda, fila de incerteza, notificação por e-mail e WhatsApp, conectores de Drive e OneDrive (simulados) |
| `/c/[token]` | A página que a contraparte abre pelo link da notificação |
| `/ler` | Leitor ao vivo. Sobe qualquer PDF e vê a extração de verdade. Precisa de modelo, ver abaixo |
| `/api/extrair` | A rota que o leitor chama: PDF entra, obrigações com citação e página saem |
| `/api/cron/monitor` | O monitor diário. Fail-closed: sem `CRON_SECRET` devolve 401 |

O `/app` roda em cima de um store em memória (`lib/data/store.ts`), semeado por
`lib/data/mocks.ts`. Não tem banco: o `lib/db/cliente.ts` está pronto para o
Supabase, mas nada o chama ainda.

---

## Rodar

```bash
npm install
npm run dev
```

Sem `.env.local` a demo e o `/app` já funcionam. As variáveis que existem estão
comentadas em `.env.example`.

**Pro `/ler` (leitura com modelo)** tem dois motores, escolhidos por
`MOTOR_LEITURA`:

- `claude-code`: roda `claude -p` na sua máquina, com a sua conta do Claude
  Code. É o padrão fora da Vercel. Precisa do `claude` no PATH e logado.
- `gateway`: AI Gateway da Vercel. Precisa de `AI_GATEWAY_API_KEY`. É o padrão
  quando está na Vercel.

**Testar a extração sem interface:**

```bash
npx tsx scripts/teste-extracao.ts public/contratos/contrato-videos-estudio.pdf
```

**Verificar:**

```bash
npm test               # 85 testes: motor de datas, relógio, extração, citações
npm run typecheck
npm run lint
npm run build
```

### Viajar no tempo

O produto vigia o tempo e uma demo dura cinco minutos. Sem um agora
sobrescrevível, o monitoramento contínuo fica invisível.

```bash
# pelo ambiente
DEMO_NOW=2026-12-02T09:00:00-03:00 npm run dev

# ou por requisição, sem reiniciar nada
curl -H "x-demo-now: 2026-12-02T09:00:00-03:00" http://localhost:3000
```

Nenhum lugar do código chama `new Date()` fora de `lib/clock.ts`.

---

## Mapa

```
lib/types.ts            o contrato de dados entre as frentes
lib/motor-datas.ts      o motor. Função pura, sem IO, sem relógio, sem modelo
lib/feriados.ts         feriado móvel derivado da Páscoa, para dia útil
lib/clock.ts            o agora injetável
lib/extracao/           pdf -> texto por página, prompt por família, verificador de citação
lib/data/               store em memória, mocks, regras de status e confiança
lib/demo/               os três contratos da demo e o resolvedor de datas
app/(app)/app/          o produto
components/produto/     as telas do produto
components/watchdog/    a demo guiada e o leitor ao vivo
components/ui/          base do shadcn, falando a língua do tokens.css
styles/tokens.css       o design system inteiro, uma cor só
contratos/preenchidos/  os três PDFs fictícios e o gabarito de 47 obrigações
tests/                  os 85 testes, todos sobre cláusulas reais
docs/                   arquitetura e o schema de extração
```

---

## Contratos

`contratos/preenchidos/` tem três PDFs **fictícios** e o gabarito das 47
obrigações. Leia o `README.md` de lá antes de mexer no motor: **o contrato A tem
uma divergência de data colocada de propósito**, para exercitar a auditoria de
coerência. Não é bug.

Os mesmos três PDFs estão em `public/contratos/`, que é de onde o produto e os
testes leem.

---

## Stack

Next.js 16, React 19, Tailwind 4, TypeScript, Vitest. Design system
[Cinnabar](https://cinnabar-catalogo.vercel.app).

## Créditos

Os guardrails do prompt de extração (instrução embutida vira texto, o sistema
extrai e sinaliza mas não aconselha, na dúvida confiança baixa) foram adaptados
de [agente-dra-julia-advocacia](https://github.com/JeffersonMFti/agente-dra-julia-advocacia)
(Jefferson Monteiro Figueira), sob licença MIT.
