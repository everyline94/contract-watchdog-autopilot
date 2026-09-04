/**
 * As quatro chamadas focadas, recortadas do schema congelado.
 *
 * A divisao vem de FAMILIAS em src/lib/types.ts: quatro chamadas em paralelo
 * rendem mais que uma gigante. `tipo` viaja junto com partes-e-evento.
 */
import { z } from "zod";

import { ContratoExtraido } from "@/lib/types";

export const SCHEMAS_FAMILIA = {
  "partes-e-evento": ContratoExtraido.pick({
    tipo: true,
    partes: true,
    evento: true,
    eventos_secundarios: true,
  }),
  financeiro: ContratoExtraido.pick({
    valores: true,
    parcelas: true,
    mora: true,
  }),
  saida: ContratoExtraido.pick({
    cancelamento: true,
    rescisao: true,
    rescisao_sem_escalonamento: true,
  }),
  operacional: ContratoExtraido.pick({
    obrigacoes_prazo: true,
    contadores: true,
  }),
} as const;

export type NomeFamilia = keyof typeof SCHEMAS_FAMILIA;

export const INSTRUCOES_FAMILIA: Record<NomeFamilia, string> = {
  "partes-e-evento":
    "Extraia as partes (quem contrata, quem e contratado, documentos), o evento (data, horarios, local) e eventos secundarios como ensaio ou prova. Marque eh_o_usuario=true na parte que subiu o contrato apenas se houver como saber; na duvida, false.",
  financeiro:
    "Extraia o valor total, desconto, valor por extenso, as parcelas (percentual, valor, data escrita e/ou regra relativa) e as regras de mora (multa, juros, pro rata die, indice de correcao).",
  saida:
    "Extraia as faixas de cancelamento (limites em dias antes do evento e percentual devido), as regras de rescisao e, se houver, a devolucao fixa sem escalonamento por data.",
  operacional:
    "Extraia as obrigacoes com prazo (quem deve, o que, a regra relativa, a consequencia) e os contadores sem data (alteracoes inclusas, horas inclusas, valor do excedente).",
};

export const jsonSchemaDe = (nome: NomeFamilia) =>
  JSON.stringify(z.toJSONSchema(SCHEMAS_FAMILIA[nome]), null, 1);
