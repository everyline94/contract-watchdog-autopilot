/**
 * Contagens derivadas do GABARITO.json, contadas em codigo.
 *
 * Nenhum numero que aparece na tela da demo e digitado a mao: se o gabarito
 * mudar, a tela muda junto. E a mesma regra do motor, aplicada ao discurso.
 */
import gabarito from "../../../contratos/preenchidos/GABARITO.json";

type DataDoGabarito = {
  escrita_no_contrato?: boolean;
  motivo_ausencia?: string;
};

type ContratoDoGabarito = {
  arquivo: string;
  datas: DataDoGabarito[];
  contadores: { id: string }[];
};

const contratos = (gabarito as unknown as { contratos: ContratoDoGabarito[] })
  .contratos;

const todas = contratos.flatMap((c) => c.datas);
const escritas = todas.filter((d) => d.escrita_no_contrato).length;
const semExistir = todas.filter((d) => d.motivo_ausencia).length;

export const NUMEROS = {
  contratos: contratos.length,
  obrigacoes: contratos.reduce(
    (n, c) => n + c.datas.length + c.contadores.length,
    0,
  ),
  datas: todas.length,
  escritas,
  semExistir,
  calculadas: todas.length - escritas - semExistir,
  naoEscritas: todas.length - escritas,
  pctNaoEscritas: Math.round(((todas.length - escritas) / todas.length) * 100),
};
