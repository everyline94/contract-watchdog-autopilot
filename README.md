# Contract Watchdog Autopilot

Construído por Bruno Lujan Larocca, Maria Eduarda Vieira de Moraes,
Fabio Wítzel e Marcelo Vieira da Silva em dois dias no hackathon Aton Praxis,
tema 29. O produto se chama Revelio.

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

Um dos três contratos tem **uma única data de obrigação em oito páginas** (a
outra data escrita nele é a da assinatura). Nove das treze
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
| `/app` | O produto: painel, upload com fila que **lê o PDF de verdade**, ficha do contrato com cláusulas e agenda, fila de incerteza, notificação por e-mail e WhatsApp, conectores de Drive e OneDrive (simulados) |
| `/c/[token]` | A página que a contraparte abre pelo link da notificação |
| `/ler` | Leitor ao vivo. Sobe qualquer PDF e vê a extração de verdade. Precisa de modelo, ver abaixo |
| `/api/extrair` | A rota que o leitor chama: PDF entra, obrigações com citação e página saem |
| `/api/cron/monitor` | O monitor diário. Fail-closed: sem `CRON_SECRET` devolve 401. Hoje é o esqueleto: autentica, resolve o relógio e devolve as janelas de aviso. Ler as datas e mandar o e-mail ainda não existe (TODO no código) |

O `/app` roda em cima de um store em memória (`src/lib/data/store.ts`), semeado por
`src/lib/data/mocks.ts`. Não tem banco: o `src/lib/db/cliente.ts` está pronto para o
Supabase, mas nada o chama ainda.

### Onde a leitura é de verdade

Dois lugares leem o PDF que você subir, pelo mesmo motor: páginas, modelo,
verificador de citação e motor de datas.

O `/ler` mostra a leitura crua: linha do calendário, citação literal, página.
É onde dá para conferir o que o sistema entendeu, campo por campo.

A fila de upload do `/app` roda a mesma leitura e traduz a saída para o
vocabulário do produto (`src/lib/data/leitura-real.ts`): cláusula com tipo,
valor, data limite e confiança. O que ficou abaixo do limiar vai para a fila
de incerteza em vez de virar prazo. Como a leitura leva minutos, ela roda em
segundo plano e a fila mostra o andamento.

Os itens que já vêm na fila ao abrir o `/app` são semeados por
`src/lib/data/mocks.ts` e continuam andando por tempo: não existe arquivo por
trás deles. Os conectores de Drive e OneDrive também são simulados, e o que
eles importam entra na fila só com o nome, sem leitura.

---

## Rodar

Precisa de Node 20.9 ou mais novo.

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

**Não tem chave de API embutida no projeto.** Rodando na sua máquina, a leitura
sai pela sua própria conta do Claude Code: instale o Claude Code, rode `claude`
uma vez e faça login. Confira com `claude --version`. Quem prefere a chave da
Vercel põe `AI_GATEWAY_API_KEY` no `.env.local` e `MOTOR_LEITURA=gateway`.

Se faltar o motor, o `/ler` e o script param na hora e dizem o que instalar,
em vez de tentar ler e falhar depois de alguns minutos.

Uma leitura leva de 3 a 8 minutos num contrato de cinco páginas. São quatro
chamadas em paralelo e a tela mostra cada família chegando.

**Testar a extração sem interface**, com qualquer PDF, de qualquer pasta:

```bash
npx tsx scripts/teste-extracao.ts public/contratos/contrato-videos-estudio.pdf
npx tsx scripts/teste-extracao.ts ~/Downloads/meu-contrato.pdf
```

PDF escaneado não passa: não tem OCR aqui, e sem texto extraível a rota
devolve 422. Teste antes com `pdftotext -layout arquivo.pdf -` se estiver na
dúvida.

**Verificar:**

```bash
npm test               # 90 testes: motor de datas, relógio, extração, citações
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

Nenhum lugar do código lê o relógio (`new Date()` sem argumento) fora de
`src/lib/clock.ts`. Os outros `new Date(...)` só montam datas a partir de ano, mês
e dia.

---

## Mapa

```
src/lib/types.ts          o contrato de dados entre as frentes
src/lib/motor-datas.ts    o motor. Função pura, sem IO, sem relógio, sem modelo
src/lib/feriados.ts       feriado móvel derivado da Páscoa, para dia útil
src/lib/clock.ts          o agora injetável
src/lib/extracao/         pdf -> texto por página, prompt por família, verificador de citação
src/lib/data/             store em memória, mocks, regras de status e confiança
src/lib/demo/             os três contratos da demo e o resolvedor de datas
src/app/(app)/app/        o produto
src/components/produto/   as telas do produto
src/components/watchdog/  a demo guiada e o leitor ao vivo
src/components/ui/        base do shadcn, falando a língua do tokens.css
src/styles/tokens.css     o design system inteiro, uma cor só
contratos/preenchidos/    os três PDFs fictícios e o gabarito de 47 obrigações
src/tests/                os 90 testes, todos sobre cláusulas reais
docs/                     arquitetura e o schema de extração
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
