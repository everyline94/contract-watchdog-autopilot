/**
 * O contrato de dados do produto. Tudo que as telas conhecem mora aqui, e so
 * aqui: componente importa tipo e hook, nunca o store. Quando o Supabase
 * entrar, esta e a fronteira que nao muda.
 */

export type StatusContrato =
  | "fechado"
  | "pendente"
  | "atrasado"
  | "em_risco"
  | "incerteza";

export type CanalNotificacao = "email" | "whatsapp";

export interface Contraparte {
  nome: string;
  email: string;
  telefone: string;
  canalPreferencial: CanalNotificacao;
}

export interface Contrato {
  id: string;
  titulo: string;
  contraparte: Contraparte;
  arquivoUrl: string;
  status: StatusContrato;
  /** ISO com hora (instante do upload). */
  dataUpload: string;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  valorCentavos: number | null;
  indiceReajuste: "IPCA" | "IGPM" | "outro" | null;
  /** 0..1, a menor confianca entre os campos extraidos. */
  confiancaExtracao: number;
  /** Abre a pagina publica /c/[token]. */
  tokenPublico: string;
}

export type TipoClausula =
  | "prazo"
  | "valor"
  | "reajuste"
  | "multa"
  | "renovacao"
  | "obrigacao";

export type StatusClausula =
  | "pendente"
  | "cumprida"
  | "atrasada"
  | "aceita"
  | "recusada";

export interface Clausula {
  id: string;
  contratoId: string;
  tipo: TipoClausula;
  textoOriginal: string;
  resumoSimplificado: string;
  /** Data civil ISO (YYYY-MM-DD), null quando a clausula nao tem prazo. */
  dataLimite: string | null;
  valorCentavos: number | null;
  responsavel: "contratante" | "contratado";
  status: StatusClausula;
  /** 0..1. Abaixo de LIMIAR_INCERTEZA vira item da fila humana. */
  confianca: number;
  revisadoPor: "ia" | "humano";
}

export type EtapaUpload =
  | "upload"
  | "leitura"
  | "extracao"
  | "revisao"
  | "concluido";

export interface ItemFilaUpload {
  id: string;
  nomeArquivo: string;
  etapa: EtapaUpload;
  /** 0..100 da etapa atual. */
  progresso: number;
  /** Erro da etapa em que parou; null quando segue vivo. */
  erro: string | null;
  /** Preenchido quando o item vira contrato, na conclusao. */
  contratoId: string | null;
}

export type MotivoIncerteza =
  | "pdf_ilegivel"
  | "clausula_ambigua"
  | "dado_faltante"
  | "baixa_confianca";

export interface ItemIncerteza {
  id: string;
  contratoId: string;
  clausulaId: string | null;
  motivo: MotivoIncerteza;
  /** O trecho do PDF como veio, sem tratamento. */
  trechoBruto: string;
  /** Imagem da pagina quando o motivo e ilegibilidade. */
  paginaPreviewUrl: string | null;
  interpretacaoSugerida: string;
  confianca: number;
  /** Nome do humano que assumiu; null enquanto aberto. */
  assumidoPor: string | null;
}

export interface EventoTimeline {
  id: string;
  contratoId: string;
  tipo:
    | "upload"
    | "extracao"
    | "revisao_humana"
    | "notificacao_enviada"
    | "resposta_contraparte";
  /** ISO com hora. */
  quando: string;
  descricao: string;
  autor: "sistema" | "ia" | "humano" | "contraparte";
}

export type AcaoContraparte = "aceite" | "nao_aceite" | "contato";

export interface RespostaContraparte {
  id: string;
  contratoId: string;
  clausulaId: string | null;
  acao: AcaoContraparte;
  /** Obrigatoria em nao_aceite e contato. */
  justificativa: string | null;
  quando: string;
}

export interface Sessao {
  usuario: { id: string; nome: string; email: string };
}

/**
 * Abaixo disso a IA nao decide sozinha: o campo vai pra fila de incerteza ate
 * um humano assumir. O leitor ao vivo usa 0.85 pro proprio corte; os dois
 * limiares sao independentes de proposito.
 */
export const LIMIAR_INCERTEZA = 0.75;

/**
 * Os conectores de importacao. A conexao e simulada nesta etapa: o que e real
 * e o caminho depois dela, porque o arquivo importado cai na MESMA fila do
 * dropzone e anda pelas mesmas etapas.
 */
export type ProvedorConector = "google-drive" | "onedrive";

export type EstadoConector = "desconectado" | "conectando" | "conectado";

export interface ArquivoConector {
  id: string;
  /** Nome do PDF como ele aparece na pasta do provedor. */
  nome: string;
  /** Tamanho ja legivel; a tela nao formata nada. */
  tamanho: string;
  /** A pasta de onde ele vem, pra conta parecer a conta de alguem. */
  pasta: string;
}

export interface Conector {
  provedor: ProvedorConector;
  estado: EstadoConector;
  /** A conta ligada; null enquanto desconectado. */
  conta: string | null;
  /** O que ainda nao foi importado: importar tira o arquivo da lista. */
  arquivos: ArquivoConector[];
}

/** Pra onde as datas do contrato vao quando a agenda e sincronizada. */
export type ProvedorAgenda = "google-agenda" | "outlook";

export type EstadoAgenda = "desconectada" | "sincronizando" | "sincronizada";

export interface SincronizacaoAgenda {
  contratoId: string;
  provedor: ProvedorAgenda | null;
  estado: EstadoAgenda;
  /** Quantas obrigacoes em aberto com data foram pra agenda. */
  total: number;
  /** ISO com hora da ultima sincronizacao; null enquanto nao houve uma. */
  quando: string | null;
}

/**
 * O que a fila aceita. Nesta etapa a leitura e simulada, entao o formato nao
 * muda o caminho: o que muda e o que a pessoa consegue soltar sem ser
 * recusada, e contrato de fornecedor de evento chega em Word tanto quanto em
 * PDF. Quando a leitura real entrar, ela converte antes de ler.
 */
export const EXTENSOES_ACEITAS = [
  ".pdf",
  ".doc",
  ".docx",
  ".odt",
  ".rtf",
] as const;

/** O que vai no accept do input, e no aviso quando o arquivo e recusado. */
export const ACCEPT_ARQUIVOS = EXTENSOES_ACEITAS.join(",");

export const ROTULO_FORMATOS = "PDF, DOC, DOCX, ODT ou RTF";

export function arquivoAceito(nome: string): boolean {
  const n = nome.toLowerCase();
  return EXTENSOES_ACEITAS.some((ext) => n.endsWith(ext));
}
