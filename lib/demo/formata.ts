/**
 * Formatacao pt-BR da demo. Tudo parte da data civil do motor (meio-dia UTC),
 * entao o fuso do Intl e UTC de proposito: nao ha hora a converter.
 */
import { deISO } from "@/lib/motor-datas";

const fmtCurta = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const fmtLonga = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const fmtDiaSemana = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "long",
});

const fmtMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** "05/12/2026" */
export const dataCurta = (iso: string) => fmtCurta.format(deISO(iso));

/** "sabado, 5 de dezembro de 2026" */
export const dataLonga = (iso: string) => fmtLonga.format(deISO(iso));

/** "sabado" */
export const nomeDia = (iso: string) => fmtDiaSemana.format(deISO(iso));

/** "R$ 5.810,00" */
export const reais = (valor: number) => fmtMoeda.format(valor);

/** Troca datas ISO dentro de um texto vindo do motor por dd/mm/aaaa. */
export const humanizaDatas = (texto: string) =>
  texto.replace(/\d{4}-\d{2}-\d{2}/g, (m) => dataCurta(m));
