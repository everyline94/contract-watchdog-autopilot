"use server";

/**
 * Os conectores de importacao: Google Drive e Microsoft OneDrive.
 *
 * A conexao e SIMULADA nesta etapa. Nao ha fetch pra fora, nao ha credencial,
 * nao ha OAuth: o estado do conector mora no store mock como qualquer outro
 * dado do produto.
 *
 * O que e real e o caminho DEPOIS dela: o arquivo importado entra na mesma
 * fila do dropzone e anda pelas mesmas etapas. Como aqui nao existe PDF, so
 * o nome, ele entra por `adicionaNomes` e avanca pelo relogio, sem leitura de
 * modelo. Quando o OAuth de verdade entrar, `conectaProvedor` passa a trazer
 * os bytes e a chamada vira `adicionaArquivos`, que le igual ao dropzone.
 */
import { db, type Store } from "./store";
import { adicionaNomes } from "./upload";
import type { Conector, ProvedorConector } from "./tipos";

/** Quanto tempo o estado "conectando" fica na tela. */
const DURACAO_CONEXAO_MS = 1600;

/** A conta que a conexao simulada devolve: a mesma da sessao mockada. */
const CONTA_SIMULADA = "bruno@revelio.app";

/** Fecha as conexoes que ja passaram da duracao. Muta o store. */
function avancaConexoes(s: Store): void {
  for (const conector of s.conectores) {
    if (conector.estado !== "conectando") continue;
    const iniciadoEm = s.conexoes.get(conector.provedor);
    if (iniciadoEm === undefined) continue;
    if (Date.now() - iniciadoEm < DURACAO_CONEXAO_MS) continue;
    conector.estado = "conectado";
    conector.conta = CONTA_SIMULADA;
    s.conexoes.delete(conector.provedor);
  }
}

export async function listaConectores(): Promise<Conector[]> {
  const s = db();
  avancaConexoes(s);
  return s.conectores.map((c) => ({ ...c, arquivos: [...c.arquivos] }));
}

export async function conectaProvedor(
  provedor: ProvedorConector,
): Promise<Conector[]> {
  const s = db();
  avancaConexoes(s);
  const conector = s.conectores.find((c) => c.provedor === provedor);
  if (conector && conector.estado === "desconectado") {
    conector.estado = "conectando";
    s.conexoes.set(provedor, Date.now());
  }
  return listaConectores();
}

export async function importaArquivo(entrada: {
  provedor: ProvedorConector;
  arquivoId: string;
}): Promise<{ ok: true; nomeArquivo: string } | { ok: false; erro: string }> {
  const s = db();
  avancaConexoes(s);
  const conector = s.conectores.find((c) => c.provedor === entrada.provedor);
  if (!conector || conector.estado !== "conectado")
    return { ok: false, erro: "Conecte a conta antes de importar." };

  const arquivo = conector.arquivos.find((a) => a.id === entrada.arquivoId);
  if (!arquivo) return { ok: false, erro: "Esse arquivo já saiu da pasta." };

  await adicionaNomes([arquivo.nome]);
  conector.arquivos = conector.arquivos.filter((a) => a.id !== arquivo.id);
  return { ok: true, nomeArquivo: arquivo.nome };
}
