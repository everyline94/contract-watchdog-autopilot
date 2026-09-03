import { ContainerPagina } from "@/components/blocos-pagina";
import type { SaltoRelogio } from "@/components/watchdog/controle-relogio";
import {
  RodapeDemo,
  SidebarDemo,
  TopoDemo,
} from "@/components/watchdog/moldura-demo";
import { Passo1 } from "@/components/watchdog/passos/passo-1";
import { Passo2 } from "@/components/watchdog/passos/passo-2";
import { Passo3 } from "@/components/watchdog/passos/passo-3";
import { Passo4 } from "@/components/watchdog/passos/passo-4";
import { Passo5 } from "@/components/watchdog/passos/passo-5";
import { Passo6 } from "@/components/watchdog/passos/passo-6";
import { agora, hojeISO } from "@/lib/clock";
import { CONTRATO_ESTUDIO, CONTRATO_SHOW } from "@/lib/demo/contratos";
import { dataCurta } from "@/lib/demo/formata";
import { montaEmail } from "@/lib/demo/monitor";
import { resolveContrato } from "@/lib/demo/resolve";
import { leEstado, TITULOS_PASSOS } from "@/lib/demo/url";
import { deISO, paraISO, somaDias } from "@/lib/motor-datas";

/**
 * A demo guiada, em seis passos: problema, documento, datas, pergunta,
 * relogio, fechamento.
 *
 * Nao e mockup. As datas saem de lib/motor-datas.ts a cada request, contra o
 * relogio da URL (?agora=), e a resposta do contrato sem data e um form GET.
 * O estado inteiro mora na URL: qualquer passo tem link direto.
 */
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const estado = leEstado(await searchParams);
  const hojeReal = hojeISO(await agora());
  const hoje = estado.agora ?? hojeReal;
  const relogioAtivo = hoje !== hojeReal;

  const linhasShow = resolveContrato(CONTRATO_SHOW, hoje, null, estado.feitos);
  const linhasEstudioAntes = resolveContrato(CONTRATO_ESTUDIO, hoje, null);
  const linhasEstudio = resolveContrato(CONTRATO_ESTUDIO, hoje, estado.evento);
  const email = montaEmail(CONTRATO_SHOW, linhasShow, hoje);

  // Os saltos do relogio saem das datas resolvidas, nunca de numero fixo.
  const salta = (iso: string, dias: number) =>
    paraISO(somaDias(deISO(iso), dias));
  const materiais = linhasShow.find((l) => l.id === "show-materiais");
  const saldo = linhasShow.find((l) => l.id === "show-saldo");
  const saltos: SaltoRelogio[] = [
    { rotulo: `hoje real, ${dataCurta(hojeReal)}`, data: null },
  ];
  if (materiais?.data) {
    const d = salta(materiais.data, -1);
    saltos.push({ rotulo: `véspera dos materiais, ${dataCurta(d)}`, data: d });
  }
  if (saldo?.data) {
    const antes = salta(saldo.data, -3);
    const depois = salta(saldo.data, 1);
    saltos.push(
      { rotulo: `3 dias antes do saldo, ${dataCurta(antes)}`, data: antes },
      { rotulo: `saldo vencido, ${dataCurta(depois)}`, data: depois },
    );
  }

  return (
    <div className="min-h-dvh bg-mesa lg:grid lg:grid-cols-[272px_1fr]">
      <SidebarDemo estado={estado} hoje={hoje} relogioAtivo={relogioAtivo} />

      <main className="min-w-0 pb-28">
        <TopoDemo estado={estado} hoje={hoje} relogioAtivo={relogioAtivo} />

        {estado.passo !== 1 ? (
          <h1 className="sr-only">
            Revelio: {TITULOS_PASSOS[estado.passo - 1]}
          </h1>
        ) : null}

        <ContainerPagina className="flex flex-col gap-10 py-8">
        {estado.passo === 1 ? <Passo1 /> : null}
        {estado.passo === 2 ? <Passo2 estado={estado} /> : null}
        {estado.passo === 3 ? (
          <Passo3 estado={estado} linhas={linhasShow} hoje={hoje} />
        ) : null}
        {estado.passo === 4 ? (
          <Passo4
            estado={estado}
            linhasAntes={linhasEstudioAntes}
            linhas={linhasEstudio}
          />
        ) : null}
        {estado.passo === 5 ? (
          <Passo5
            estado={estado}
            linhas={linhasShow}
            email={email}
            saltos={saltos}
            hoje={hoje}
            relogioAtivo={relogioAtivo}
          />
        ) : null}
        {estado.passo === 6 ? <Passo6 /> : null}
        </ContainerPagina>

        <RodapeDemo estado={estado} />
      </main>
    </div>
  );
}
