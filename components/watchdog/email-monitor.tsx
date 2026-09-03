import * as React from "react";

import { dataCurta, dataLonga, humanizaDatas, reais } from "@/lib/demo/formata";
import type { ContratoDemo } from "@/lib/demo/contratos";
import type { EmailDoMonitor } from "@/lib/demo/monitor";

/**
 * O e-mail que o monitor das 06:00 mandaria hoje, como ele seria.
 *
 * Nada aqui e texto fixo: valor, encargo do dia (pro rata die), clausula com
 * pagina e a data da decisao saem do motor a cada request. Avancar o relogio
 * um dia muda o total, na frente de quem olha.
 */
export function EmailMonitor({
  email,
  contrato,
  hoje,
}: {
  email: EmailDoMonitor;
  contrato: ContratoDemo;
  hoje: string;
}) {
  return (
    <article className="overflow-hidden rounded-lg bg-papel shadow-flutuante">
      <header className="flex flex-col gap-1 border-b border-linha px-5 py-4">
        <p className="text-rotulo text-texto-tenue uppercase">
          e-mail montado pelo monitor de hoje, {dataCurta(hoje)}, às 06:00
        </p>
        <p className="text-ui text-texto-suave">
          Para: você · Sobre: {contrato.nome}, {contrato.contraparte}
        </p>
        <p className="text-corpo font-semibold">{email.assunto}</p>
      </header>

      <div className="flex flex-col gap-4 px-5 py-4">
        {email.cobrancas.map(({ linha, mora }) => (
          <div key={linha.id} className="flex flex-col gap-1.5">
            <p className="text-corpo">
              {linha.titulo}, {reais(mora.principal)}, venceu em{" "}
              {dataLonga(linha.data!)} e não consta como paga: são{" "}
              {mora.diasAtraso} {mora.diasAtraso === 1 ? "dia" : "dias"} de
              atraso.
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 font-mono text-ui tabular-nums">
              <dt className="text-texto-tenue">multa de {contrato.mora.multaPercentual}%</dt>
              <dd className="text-right">{reais(mora.multa)}</dd>
              <dt className="text-texto-tenue">
                juros de {contrato.mora.jurosMensalPercentual}% ao mês, pro rata die
              </dt>
              <dd className="text-right">{reais(mora.juros)}</dd>
              <dt className="text-texto">a cobrar hoje</dt>
              <dd className="text-right font-semibold">{reais(mora.total)}</dd>
            </dl>
            <blockquote className="mt-1 border-l-2 border-linha-campo pl-3 text-ui text-texto-suave">
              {'"'}
              {linha.evidencia.citacao}
              {'"'} ({linha.evidencia.rotulo})
            </blockquote>
          </div>
        ))}

        <p className="text-corpo">
          Total em aberto hoje: <strong>{reais(email.totalHoje)}</strong>.
          Amanhã passa a {reais(email.totalAmanha)}, porque o juro conta por
          dia.
        </p>

        {email.divergencia ? (
          <p className="rounded-md bg-aviso px-3 py-2 text-ui text-sobre-aviso">
            {humanizaDatas(email.divergencia)}
          </p>
        ) : null}

        {email.decisao?.data ? (
          <p className="rounded-md bg-papel-fundo px-3 py-2.5 text-corpo">
            Se o atraso persistir até{" "}
            <strong>{dataLonga(email.decisao.data)}</strong> (48 horas antes do
            evento), o contrato autoriza {contrato.id === "show" ? "não comparecer sem devolver o que já foi pago" : "considerar o contrato rescindido por culpa da contratante"}.{" "}
            <span className="text-texto-suave">
              ({email.decisao.evidencia.rotulo})
            </span>
          </p>
        ) : null}
      </div>

      <footer className="border-t border-linha px-5 py-3">
        <p className="text-rotulo text-texto-tenue">
          Escrito e enviado sem gente: a decisão de cobrar é sua, a conta é do
          sistema.
        </p>
      </footer>
    </article>
  );
}
