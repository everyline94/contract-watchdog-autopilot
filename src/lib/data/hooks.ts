"use client";

/**
 * A unica porta das telas pro dado: hook + tipo. Os hooks chamam as server
 * actions de src/lib/data; componente nenhum sabe de onde o dado vem.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { estadoAgenda, sincronizaAgenda } from "./agenda";
import {
  conectaProvedor,
  importaArquivo,
  listaConectores,
} from "./conectores";
import { buscaContrato, listaContratos, resumoDashboard } from "./contratos";
import type { FiltroIncerteza, DecisaoIncerteza } from "./incerteza";
import { listaIncerteza, resolveItemIncerteza } from "./incerteza";
import {
  montaNotificacao,
  montaNotificacaoPorToken,
  registraResposta,
} from "./notificacoes";
import {
  adicionaArquivos,
  concluiRevisao,
  listaFila,
  resultadoExtracao,
} from "./upload";
import type { ProvedorConector, StatusContrato } from "./tipos";

export function useResumoDashboard() {
  return useQuery({
    queryKey: ["resumo"],
    queryFn: () => resumoDashboard(),
  });
}

export function useContratos(filtro?: StatusContrato) {
  return useQuery({
    queryKey: ["contratos", filtro ?? "todos"],
    queryFn: () => listaContratos(filtro),
  });
}

export function useContrato(id: string) {
  return useQuery({
    queryKey: ["contrato", id],
    queryFn: () => buscaContrato(id),
  });
}

export function useIncerteza(filtro?: FiltroIncerteza) {
  return useQuery({
    queryKey: ["incerteza", filtro?.motivo ?? "todos", filtro?.contratoId ?? "todos"],
    queryFn: () => listaIncerteza(filtro),
  });
}

export function useResolveIncerteza() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entrada: DecisaoIncerteza) => resolveItemIncerteza(entrada),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useFilaUpload() {
  return useQuery({
    queryKey: ["fila-upload"],
    queryFn: () => listaFila(),
    // A simulacao avanca no servidor; o poll e o que faz a barra andar.
    refetchInterval: 1000,
  });
}

export function useAdicionaArquivos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nomes: string[]) => adicionaArquivos(nomes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fila-upload"] }),
  });
}

export function useResultadoExtracao(itemId: string | null) {
  return useQuery({
    queryKey: ["resultado-extracao", itemId],
    queryFn: () => resultadoExtracao(itemId!),
    enabled: Boolean(itemId),
  });
}

export function useConcluiRevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entrada: Parameters<typeof concluiRevisao>[0]) =>
      concluiRevisao(entrada),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useConectores() {
  return useQuery({
    queryKey: ["conectores"],
    queryFn: () => listaConectores(),
    // O poll so existe enquanto uma conexao esta em andamento: e ele que faz
    // o "conectando" virar "conectado" na tela. Fora disso, silencio.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((c) => c.estado === "conectando")
        ? 400
        : false,
  });
}

export function useConectaProvedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provedor: ProvedorConector) => conectaProvedor(provedor),
    onSuccess: (conectores) => qc.setQueryData(["conectores"], conectores),
  });
}

export function useImportaArquivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entrada: Parameters<typeof importaArquivo>[0]) =>
      importaArquivo(entrada),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conectores"] });
      qc.invalidateQueries({ queryKey: ["fila-upload"] });
    },
  });
}

export function useAgenda(contratoId: string) {
  return useQuery({
    queryKey: ["agenda", contratoId],
    queryFn: () => estadoAgenda(contratoId),
    // Mesmo desenho do conector: o poll so vive enquanto sincroniza.
    refetchInterval: (query) =>
      query.state.data?.estado === "sincronizando" ? 400 : false,
  });
}

export function useSincronizaAgenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entrada: Parameters<typeof sincronizaAgenda>[0]) =>
      sincronizaAgenda(entrada),
    onSuccess: (agenda) =>
      qc.setQueryData(["agenda", agenda.contratoId], agenda),
  });
}

export function useNotificacao(contratoId: string) {
  return useQuery({
    queryKey: ["notificacao", contratoId],
    queryFn: () => montaNotificacao(contratoId),
  });
}

export function useNotificacaoPorToken(token: string) {
  return useQuery({
    queryKey: ["notificacao-token", token],
    queryFn: () => montaNotificacaoPorToken(token),
  });
}

export function useRegistraResposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entrada: Parameters<typeof registraResposta>[0]) =>
      registraResposta(entrada),
    onSuccess: () => qc.invalidateQueries(),
  });
}
