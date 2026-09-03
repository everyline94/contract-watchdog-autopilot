# Arquitetura

Decisões técnicas do MVP. Otimizado para 24h com 4 pessoas trabalhando em
paralelo sem se atropelar.

---

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| App | Next.js App Router na Vercel | Deploy contínuo, preview por branch, e o cron mora junto com o app |
| Banco | Supabase (Postgres) | Já configurado no ambiente, RLS desde o nascimento |
| Storage do PDF | Vercel Blob (privado) | URL assinada com expiração, sem servidor de arquivo |
| Extração | AI SDK com structured output (zod) via AI Gateway | Schema garante formato, gateway dá fallback de provedor e retenção zero |
| Parse do PDF | pdfjs no servidor | Precisa de texto **com número de página**, senão não há evidência clicável |
| Cron | Vercel Cron, diário | Uma linha de config, e é o coração do produto |
| E-mail | provisionar pelo marketplace da Vercel | Domínio verificado e log de entrega sem montar SMTP |

Runtime Node.js padrão em tudo. Nada de edge: o parse de PDF e a extração
precisam de APIs de Node e de tempo de execução folgado.

---

## Pipeline

```
POST /api/contracts/upload
   |
   v
 Blob (privado)  ->  pdfjs  ->  { pagina, texto, bbox }[]
                                     |
                                     v
                       generateObject(schema, texto_paginado)
                                     |
                                     v
              obligations[]  { valor, citacao, pagina, confianca }
                                     |
                        +------------+------------+
                        |                         |
                conf >= 0.85              conf < 0.85
                        |                         |
                        v                         v
              motor de datas (puro)        review_queue
                        |
                        v
                  key_dates[]  { tipo, due_date, valor, responsavel }


GET /api/cron/monitor   (diário, 06:00 America/Sao_Paulo)
   |
   v
 query key_dates x janela  ->  agrupa por contrato  ->  e-mail  ->  alerts
```

### O pipeline canônico é PDF, e isso não é detalhe

Verificado nos arquivos reais: os modelos em `.docx` numeram as cláusulas com
lista multinível automática do Word, definida em `word/numbering.xml` (211
níveis decimais). Ao converter para texto puro, todo item vira o mesmo marcador
e **"Cláusula 3.1.1" deixa de existir no texto**.

Sem numeração e sem página não há citação verificável, e a ficha com evidência,
que é o que faz o cliente parar de conferir na mão, morre.

Decisão: `.docx` é convertido para PDF na ingestão, antes de qualquer parse. O
PDF renderiza a numeração e cria a paginação, então citação e página saem de
graça com um caminho de código só. Contrato assinado circula em PDF de qualquer
forma; o `.docx` é o modelo interno do fornecedor.

Conversão: `soffice --headless --convert-to pdf` (`brew install --cask
libreoffice`). Se não couber no tempo, o MVP aceita só PDF na entrada.

### Por que o parse tem que guardar a página

A ficha com evidência (saída 3) é o que faz o CFO ou a dona da assessoria
parar de conferir na mão. Se o parse jogar fora o número da página no primeiro
passo, não há como recuperar depois, e a terceira entrega morre. Guardar
`{pagina, texto}` desde o início custa nada e não é recuperável mais tarde.

---

## Modelo de dados

```sql
-- 1 schema por sub-projeto, tabelas no plural, RLS ligado desde o nascimento

create schema watchdog;

create table watchdog.contracts (
  id            uuid primary key default gen_random_uuid(),
  owner_email   text not null,           -- quem recebe o alerta
  counterparty  text,                    -- fornecedor ou cliente
  kind          text,                    -- 'cliente' | 'fornecedor'
  event_name    text,
  event_date    date,                    -- a âncora
  signed_at     date,
  total_cents   bigint,
  blob_url      text not null,
  status        text default 'ativo',    -- ativo | encerrado | cancelado
  parent_id     uuid references watchdog.contracts(id),  -- aditivo aponta pro pai
  created_at    timestamptz default now()
);

create table watchdog.obligations (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid not null references watchdog.contracts(id) on delete cascade,
  field_key   text not null,             -- 'saldo_pre_evento', 'reajuste', ...
  value       jsonb not null,
  clause_quote text not null,            -- citação literal, sem parafrasear
  page        int not null,
  confidence  numeric(3,2) not null,
  status      text default 'pendente',   -- pendente | confirmado | rejeitado
  created_at  timestamptz default now()
);

create table watchdog.key_dates (
  id            uuid primary key default gen_random_uuid(),
  contract_id   uuid not null references watchdog.contracts(id) on delete cascade,
  obligation_id uuid references watchdog.obligations(id),
  kind          text not null,           -- ver tipos em lib/types.ts
  due_date      date not null,
  amount_cents  bigint,
  anchor        text not null,           -- 'evento' | 'assinatura' | 'absoluta'
  offset_days   int,
  day_basis     text default 'corridos', -- corridos | uteis
  status        text default 'ativa',    -- ativa | cumprida | superseded
  superseded_by uuid references watchdog.contracts(id),
  computed_at   timestamptz default now()
);

create table watchdog.alerts (
  id          uuid primary key default gen_random_uuid(),
  key_date_id uuid not null references watchdog.key_dates(id) on delete cascade,
  window_key  text not null,             -- 'T-30', 'T-7', 'T0', 'overdue'
  sent_at     timestamptz default now(),
  channel     text default 'email',
  payload     jsonb,
  unique (key_date_id, window_key)       -- idempotência: nunca manda 2x
);

create table watchdog.economic_index (
  code       text not null,              -- 'IPCA' | 'IGPM'
  ref_month  date not null,
  pct_month  numeric(6,3) not null,
  primary key (code, ref_month)
);
```

A `unique (key_date_id, window_key)` em `alerts` é o que impede o cron de
mandar o mesmo alerta duas vezes se rodar duas vezes no mesmo dia. Vale mais
que qualquer flag de controle no código.

---

## O relógio injetável (isto decide a demo)

O produto vigia o tempo. Uma demo dura cinco minutos. Sem resolver isso, o
monitoramento contínuo, que é o coração da tese, fica invisível no palco.

**Regra: nenhum lugar do código chama `new Date()` direto.** Tudo passa por:

```ts
// lib/clock.ts
export function now(): Date {
  const override = process.env.DEMO_NOW ?? headers().get('x-demo-now')
  return override ? new Date(override) : new Date()
}
```

Com isso, na demo vocês sobem o contrato com o júri olhando, mostram as datas
calculadas, e então avançam o relógio para 3 dias antes do saldo. O cron roda,
o e-mail chega na caixa de entrada projetada na tela. Isso é o momento que
vende o produto, e ele só existe se o relógio for injetável desde a primeira
linha de código.

Corolário: o motor de datas é uma função pura `(contrato, hoje) -> datas`.
Nunca lê o relógio por dentro. Isso também é o que torna o teste unitário
trivial.

---

## Extração: como não deixar o modelo inventar

1. **Structured output com zod.** O modelo não escolhe o formato.
2. **Citação obrigatória.** Todo campo exige `clause_quote`. O prompt pede
   trecho literal, e um pós-processamento verifica se a citação existe de fato
   no texto da página informada. Se não existir, a confiança cai a zero e o
   campo vai para a fila humana. Isso mata a alucinação de forma mecânica, sem
   depender do modelo se comportar.
3. **Confiança por campo, não por documento.** Um contrato pode ter vigência
   cristalina e cláusula de reajuste ambígua. Confiança agregada esconde isso.
4. **O modelo nunca calcula.** Ele devolve `{ancora, offset_dias, base}`,
   nunca uma data pronta. Se o contrato traz uma data absoluta escrita, ele
   devolve a data como texto e o parse dela é código.
5. **Uma passada por família de cláusula.** Pagamento, cancelamento, reajuste e
   entregáveis em chamadas separadas rendem mais que uma chamada gigante, e
   permitem rodar as quatro em paralelo.

---

## Ordem de construção

O que dá para paralelizar de verdade sem quatro pessoas travando no mesmo
arquivo. Contrato de interface primeiro, implementação depois.

**Passo 0, os quatro juntos, 30 minutos.** Congelar dois arquivos:
`types.ts` (o schema zod da extração) e o schema SQL acima. A partir daí cada
um trabalha contra tipo, não contra código do outro. Meia hora aqui economiza
quatro horas de merge.

Depois disso as frentes ficam independentes:

- Ingestão e extração dependem só do schema zod.
- O motor de datas depende só do schema zod, e pode ser construído inteiro com
  fixture em JSON, sem esperar a extração funcionar.
- O front depende só do schema SQL, e pode ser construído com seed no banco.
- O cron e o e-mail dependem só da tabela `key_dates`, e podem ser construídos
  com linha inserida na mão.

Nenhuma frente espera a outra. É por isso que o passo 0 não é opcional.
