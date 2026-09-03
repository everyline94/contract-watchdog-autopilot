import * as React from "react";

import { Secao } from "@/components/blocos-pagina";
import { TileMetrica } from "@/components/tile-metrica";
import { LinhaObrigacao } from "@/components/watchdog/linha-obrigacao";
import { PaginaDestacada } from "@/components/watchdog/pagina-destacada";
import { dataCurta, humanizaDatas, nomeDia } from "@/lib/demo/formata";
import { contagens, type Linha } from "@/lib/demo/resolve";
import type { EstadoDemo } from "@/lib/demo/url";

/**
 * Passo 3: as datas aparecem, e fica explicito quais nao estavam escritas.
 * O contraste escrita/calculada e o produto inteiro.
 */
export function Passo3({
  estado,
  linhas,
  hoje,
}: {
  estado: EstadoDemo;
  linhas: Linha[];
  hoje: string;
}) {
  const n = contagens(linhas);
  const saldo = linhas.find((l) => l.id === "show-saldo");

  return (
    <>
      <Secao
        titulo="Um calendário que o contrato não tem"
        descricao={`As etiquetas dizem de onde cada data veio. Das ${n.total} obrigações com prazo deste contrato, só ${n.escritas} têm a data escrita no documento: as outras ${n.calculadas + n.semData} são calculadas de uma regra, ou dependem de algo que ainda não aconteceu.`}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <TileMetrica rotulo="obrigações com prazo" valor={String(n.total)} />
          <TileMetrica
            rotulo="escritas no contrato"
            valor={String(n.escritas)}
          />
          <TileMetrica
            rotulo="calculadas pelo motor"
            valor={String(n.calculadas)}
            nota="agora, nesta visita"
          />
          <TileMetrica rotulo="sem âncora ainda" valor={String(n.semData)} />
        </div>

        <div className="rounded-lg bg-papel px-5 shadow-papel">
          {linhas.map((l) => (
            <LinhaObrigacao key={l.id} linha={l} estado={estado} hoje={hoje} />
          ))}
        </div>
      </Secao>

      {saldo ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-lg bg-papel p-5 shadow-papel">
            <p className="text-rotulo uppercase text-texto-tenue">
              auditoria de coerência
            </p>
            <p className="text-corpo text-texto">
              O saldo aparece duas vezes no documento: como regra (7 dias antes
              do evento) e como data preenchida à mão. As duas divergem: quem
              preencheu errou a conta, e isso acontece o tempo todo. O sistema
              não corrige em silêncio: mantém a data assinada como vigente e
              avisa nas duas.
            </p>
            {saldo.divergencia ? (
              <p className="rounded-md bg-aviso px-3 py-2 text-ui text-sobre-aviso">
                {humanizaDatas(saldo.divergencia)}
              </p>
            ) : null}
            <details>
              <summary className="cursor-pointer text-rotulo text-texto-tenue underline decoration-dotted underline-offset-2 hover:text-texto-suave">
                ver as duas na página {saldo.evidencia.pagina} do contrato
              </summary>
              <PaginaDestacada
                className="mt-3"
                nome="a-saldo"
                alt="Página do contrato com a regra e a data escrita destacadas"
              />
            </details>
          </div>

          {saldo.regraCrua && saldo.regraAjustada ? (
            <div className="flex flex-col gap-3 rounded-lg bg-papel p-5 shadow-papel">
              <p className="text-rotulo uppercase text-texto-tenue">
                regra de borda
              </p>
              <p className="text-corpo text-texto">
                A conta da regra dá {dataCurta(saldo.regraCrua)}, que cai num{" "}
                {nomeDia(saldo.regraCrua)}. Prazo que conta para trás antecipa,
                porque postergar seria perder o prazo: o dia útil de cobrar é{" "}
                {nomeDia(saldo.regraAjustada)}, {dataCurta(saldo.regraAjustada)}
                . Calendário também é cláusula, e ninguém faz essa conta de
                cabeça.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
