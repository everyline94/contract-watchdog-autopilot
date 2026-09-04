"use server";

/**
 * A fila de upload.
 *
 * PDF que a pessoa sobe e lido de verdade: o arquivo chega no servidor, passa
 * pelo mesmo motor do `/ler` (paginas, modelo, verificador de citacao, motor
 * de datas) e as clausulas saem do documento dela. A leitura leva minutos,
 * entao roda em segundo plano e a fila mostra o andamento.
 *
 * Os itens semeados em `mocks.ts` continuam andando por tempo, com o
 * resultado canonico de `extracaoSimulada`: nao existe arquivo por tras
 * deles, eles sao a vitrine do painel. A separacao e o `andamento.leitura`:
 * quem tem leitura real anda por ela, quem nao tem anda pelo relogio.
 */
import { faltaPraLer } from "@/lib/extracao/extrator";
import { agora, hojeISO } from "@/lib/clock";
import { deISO, paraISO, somaDias } from "@/lib/motor-datas";
import { ErroLeitura, leContrato } from "./leitura-real";
import { geraItensIncerteza } from "./regras";
import {
  db,
  derivaContrato,
  proximoId,
  type Andamento,
  type Store,
} from "./store";
import {
  EXTENSOES_ACEITAS,
  LIMIAR_INCERTEZA,
  type Clausula,
  type Contraparte,
  type ItemFilaUpload,
} from "./tipos";

type ClausulaExtraida = Omit<Clausula, "id" | "contratoId">;

export type ResultadoExtracao = {
  itemId: string;
  nomeArquivo: string;
  tituloSugerido: string;
  clausulas: (ClausulaExtraida & { naFila: boolean })[];
};

/** Duracao simulada de cada etapa automatica, em ms. */
const ETAPAS_SIMULADAS = [
  { etapa: "upload", duracao: 1500 },
  { etapa: "leitura", duracao: 3000 },
  { etapa: "extracao", duracao: 4500 },
] as const;

const PADRAO_ERRO = /ilegivel|ilegível|corrompido|senha|foto/i;

function tituloDoArquivo(nome: string): string {
  // Tira a extensao seja ela qual for: a fila aceita mais que PDF.
  const padrao = new RegExp(
    `(${EXTENSOES_ACEITAS.map((e) => e.replace(".", "\\.")).join("|")})$`,
    "i",
  );
  const semExtensao = nome.replace(padrao, "").replace(/[-_]+/g, " ").trim();
  return semExtensao.charAt(0).toUpperCase() + semExtensao.slice(1);
}

/** O resultado canonico da leitura simulada: 6 clausulas, uma abaixo do limiar. */
function extracaoSimulada(hoje: string): ClausulaExtraida[] {
  const d = (n: number) => paraISO(somaDias(deISO(hoje), n));
  const base = {
    responsavel: "contratante" as const,
    status: "pendente" as const,
    revisadoPor: "ia" as const,
  };
  return [
    {
      ...base,
      tipo: "valor",
      resumoSimplificado: "Entrada de 30% na assinatura",
      textoOriginal:
        "Cláusula 4.1. A CONTRATANTE pagará, a título de sinal, 30% (trinta por cento) do valor total no ato da assinatura do presente instrumento.",
      dataLimite: d(2),
      valorCentavos: 540000,
      confianca: 0.97,
    },
    {
      ...base,
      tipo: "valor",
      resumoSimplificado: "Saldo até 7 dias antes do evento",
      textoOriginal:
        "Cláusula 4.2. O saldo remanescente deverá estar quitado até 7 (sete) dias corridos antes da data de realização do evento.",
      dataLimite: d(53),
      valorCentavos: 1260000,
      confianca: 0.93,
    },
    {
      ...base,
      tipo: "obrigacao",
      resumoSimplificado: "Enviar cronograma e lista de fornecedores",
      textoOriginal:
        "Cláusula 6.2. A CONTRATANTE encaminhará o cronograma do evento e a relação de fornecedores com 20 (vinte) dias de antecedência.",
      dataLimite: d(40),
      valorCentavos: null,
      confianca: 0.9,
    },
    {
      ...base,
      tipo: "multa",
      resumoSimplificado: "Multa de 20% por cancelamento",
      textoOriginal:
        "Cláusula 9.1. O cancelamento imotivado por qualquer das partes ensejará multa compensatória de 20% (vinte por cento) sobre o valor total.",
      dataLimite: null,
      valorCentavos: 360000,
      confianca: 0.88,
    },
    {
      ...base,
      tipo: "renovacao",
      resumoSimplificado: "Renovação mediante aviso com 60 dias",
      textoOriginal:
        "Cláusula 12.1. O presente contrato poderá ser renovado por igual período mediante manifestação com 60 (sessenta) dias de antecedência.",
      dataLimite: d(20),
      valorCentavos: null,
      confianca: 0.86,
    },
    {
      ...base,
      tipo: "reajuste",
      resumoSimplificado: "Reajuste por índice citado de forma ambígua",
      textoOriginal:
        "Cláusula 10.3. Havendo prorrogação, os valores serão atualizados pelo índice setorial aplicável, apurado na forma da regulamentação vigente.",
      dataLimite: null,
      valorCentavos: null,
      confianca: 0.61,
    },
  ];
}

/** Quanto tempo simulado o item ja percorreu, a partir de etapa e progresso. */
function decorridoDe(item: ItemFilaUpload): number {
  let inicio = 0;
  for (const fase of ETAPAS_SIMULADAS) {
    if (fase.etapa === item.etapa)
      return inicio + Math.round((item.progresso / 100) * fase.duracao);
    inicio += fase.duracao;
  }
  return 0;
}

/**
 * Andamento de quem esta sendo lido de verdade. A barra sobe devagar ate 95%
 * porque nao ha como saber quanto falta: sao quatro chamadas ao modelo e o
 * tempo varia com o tamanho do contrato. Chutar 100% antes da hora seria
 * mentir para quem espera.
 */
function avancaLeituraReal(item: ItemFilaUpload, andamento: Andamento): void {
  const l = andamento.leitura!;
  if (l.erro) {
    item.erro = l.erro;
    return;
  }
  if (l.terminadaEm) {
    item.etapa = "revisao";
    item.progresso = 100;
    return;
  }
  const decorrido = Date.now() - l.comecouEm;
  if (decorrido < 2000) {
    item.etapa = "leitura";
    item.progresso = Math.round((decorrido / 2000) * 100);
    return;
  }
  item.etapa = "extracao";
  // Quatro minutos e a leitura tipica de um contrato de cinco paginas.
  item.progresso = Math.min(95, Math.round(((decorrido - 2000) / 240_000) * 100));
}

/** Avanca os itens vivos: leitura real quando existe, relogio quando nao. */
function avancaFila(s: Store, hoje: string): void {
  for (const item of s.filaUpload) {
    if (item.erro || item.etapa === "revisao" || item.etapa === "concluido")
      continue;

    const real = s.andamento.get(item.id);
    if (real?.leitura) {
      avancaLeituraReal(item, real);
      continue;
    }

    // Item semeado sem relogio ganha um no primeiro poll, ajustado pra
    // continuar de onde a semente o deixou: a fila inteira anda sozinha.
    let andamento = s.andamento.get(item.id);
    if (!andamento?.iniciadoEm) {
      andamento = { ...andamento, iniciadoEm: Date.now() - decorridoDe(item) };
      s.andamento.set(item.id, andamento);
    }

    const decorrido = Date.now() - andamento.iniciadoEm!;
    let inicio = 0;
    let definido = false;

    for (const fase of ETAPAS_SIMULADAS) {
      const fim = inicio + fase.duracao;
      if (decorrido < fim) {
        item.etapa = fase.etapa;
        item.progresso = Math.round(((decorrido - inicio) / fase.duracao) * 100);
        definido = true;
        break;
      }
      inicio = fim;
    }

    // Arquivo que simula falha morre na leitura, com erro por etapa.
    if (
      PADRAO_ERRO.test(item.nomeArquivo) &&
      (item.etapa !== "upload" || !definido)
    ) {
      item.etapa = "leitura";
      item.progresso = 34;
      item.erro =
        "Não conseguimos ler o arquivo. Ele parece escaneado em baixa qualidade ou protegido por senha; peça o PDF original à contraparte.";
      continue;
    }

    if (!definido) {
      item.etapa = "revisao";
      item.progresso = 100;
      if (!andamento.extraidas) andamento.extraidas = extracaoSimulada(hoje);
    }
  }
}

export async function listaFila(): Promise<ItemFilaUpload[]> {
  const s = db();
  avancaFila(s, hojeISO(await agora()));
  return [...s.filaUpload].reverse();
}

/**
 * Dispara a leitura de verdade em segundo plano.
 *
 * Nao da pra esperar aqui: sao minutos, e a server action responde em
 * segundos pra fila aparecer na hora. O resultado aterrissa no andamento e o
 * poll da fila encontra. Sem `await` de proposito, e por isso o catch e
 * obrigatorio: promise solta que rejeita derruba o processo do Node.
 */
function disparaLeitura(s: Store, itemId: string, bytes: Uint8Array): void {
  const andamento = s.andamento.get(itemId);
  if (!andamento?.leitura) return;

  void (async () => {
    try {
      const hoje = hojeISO(await agora());
      const clausulas = await leContrato(bytes, hoje);
      const atual = db().andamento.get(itemId);
      if (!atual?.leitura) return;
      atual.extraidas = clausulas;
      atual.leitura.terminadaEm = Date.now();
    } catch (e) {
      const atual = db().andamento.get(itemId);
      if (!atual?.leitura) return;
      // Erro de leitura tem texto de produto; o resto vira mensagem generica
      // e o cru vai pro log do servidor, nunca pro card da fila.
      if (e instanceof ErroLeitura) {
        atual.leitura.erro = e.message;
      } else {
        console.error("[upload] leitura falhou:", e);
        atual.leitura.erro =
          "A leitura falhou no meio do caminho. Tente subir o arquivo de novo.";
      }
      atual.leitura.terminadaEm = Date.now();
    }
  })();
}

export async function adicionaArquivos(
  form: FormData,
): Promise<ItemFilaUpload[]> {
  const s = db();
  const arquivos = form.getAll("arquivos").filter((a): a is File => a instanceof File);

  // O motor de pe antes de aceitar o arquivo: melhor recusar na entrada, com
  // o que instalar, do que deixar a fila andar minutos pra morrer no fim.
  const falta = faltaPraLer();

  const novos: ItemFilaUpload[] = [];
  for (const arquivo of arquivos) {
    const item: ItemFilaUpload = {
      id: proximoId(s, "up"),
      nomeArquivo: arquivo.name,
      etapa: "upload",
      progresso: 0,
      erro: falta,
      contratoId: null,
    };
    s.filaUpload.push(item);
    s.andamento.set(item.id, {
      iniciadoEm: Date.now(),
      leitura: { comecouEm: Date.now(), terminadaEm: null, erro: falta },
    });
    if (!falta) {
      disparaLeitura(s, item.id, new Uint8Array(await arquivo.arrayBuffer()));
    }
    novos.push(item);
  }
  return novos;
}

/** Mantido para os testes e para a semente, que nao tem arquivo por tras. */
export async function adicionaNomes(nomes: string[]): Promise<ItemFilaUpload[]> {
  const s = db();
  const novos = nomes.map((nome): ItemFilaUpload => {
    const item: ItemFilaUpload = {
      id: proximoId(s, "up"),
      nomeArquivo: nome,
      etapa: "upload",
      progresso: 0,
      erro: null,
      contratoId: null,
    };
    s.filaUpload.push(item);
    s.andamento.set(item.id, { iniciadoEm: Date.now() });
    return item;
  });
  return novos;
}

export async function resultadoExtracao(
  itemId: string,
): Promise<ResultadoExtracao | null> {
  const s = db();
  const hoje = hojeISO(await agora());
  avancaFila(s, hoje);
  const item = s.filaUpload.find((i) => i.id === itemId);
  if (!item || item.etapa !== "revisao") return null;

  const andamento = s.andamento.get(item.id) ?? { iniciadoEm: null };
  if (!andamento.extraidas) {
    andamento.extraidas = extracaoSimulada(hoje);
    s.andamento.set(item.id, andamento);
  }

  return {
    itemId: item.id,
    nomeArquivo: item.nomeArquivo,
    tituloSugerido: tituloDoArquivo(item.nomeArquivo),
    clausulas: andamento.extraidas.map((c) => ({
      ...c,
      naFila: c.confianca < LIMIAR_INCERTEZA,
    })),
  };
}

export async function concluiRevisao(entrada: {
  itemId: string;
  titulo: string;
  contraparte: Contraparte;
}): Promise<{ ok: true; contratoId: string } | { ok: false; erro: string }> {
  const s = db();
  const hoje = hojeISO(await agora());
  avancaFila(s, hoje);

  const item = s.filaUpload.find((i) => i.id === entrada.itemId);
  if (!item) return { ok: false, erro: "Item não encontrado na fila." };
  if (item.etapa !== "revisao")
    return { ok: false, erro: "O item ainda não chegou na etapa de revisão." };

  const { nome, email, telefone } = entrada.contraparte;
  if (!entrada.titulo.trim() || !nome.trim() || !email.trim() || !telefone.trim())
    return { ok: false, erro: "Preencha título e os dados da contraparte." };

  const andamento = s.andamento.get(item.id) ?? { iniciadoEm: null };
  const extraidas = andamento.extraidas ?? extracaoSimulada(hoje);

  const contratoId = proximoId(s, "c");
  const agoraISO = (await agora()).toISOString();

  const clausulas: Clausula[] = extraidas.map((c, i) => ({
    ...c,
    id: `${contratoId}-cl${String(i + 1).padStart(2, "0")}`,
    contratoId,
  }));
  s.clausulas.push(...clausulas);

  s.contratos.push({
    id: contratoId,
    titulo: entrada.titulo.trim(),
    contraparte: entrada.contraparte,
    arquivoUrl: `/uploads/${item.nomeArquivo}`,
    status: "pendente",
    dataUpload: agoraISO,
    vigenciaInicio: hoje,
    vigenciaFim: null,
    valorCentavos: clausulas.reduce(
      (soma, c) => soma + (c.tipo === "valor" ? (c.valorCentavos ?? 0) : 0),
      0,
    ),
    indiceReajuste: null,
    confiancaExtracao: 1,
    tokenPublico: proximoId(s, "tok"),
  });

  for (const pendente of geraItensIncerteza(clausulas)) {
    s.incertezas.push({ ...pendente, id: proximoId(s, "inc") });
  }

  s.eventos.push(
    {
      id: proximoId(s, "ev"),
      contratoId,
      tipo: "upload",
      quando: agoraISO,
      descricao: `Arquivo recebido: ${item.nomeArquivo}`,
      autor: "sistema",
    },
    {
      id: proximoId(s, "ev"),
      contratoId,
      tipo: "extracao",
      quando: agoraISO,
      descricao: `Leitura concluída: ${clausulas.length} cláusulas extraídas, ${
        clausulas.filter((c) => c.confianca < LIMIAR_INCERTEZA).length
      } enviada(s) para a fila de incerteza`,
      autor: "ia",
    },
  );

  item.etapa = "concluido";
  item.progresso = 100;
  item.contratoId = contratoId;

  derivaContrato(s, contratoId, hoje);
  return { ok: true, contratoId };
}
