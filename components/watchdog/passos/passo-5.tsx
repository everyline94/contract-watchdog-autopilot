import * as React from "react";

import { Secao } from "@/components/blocos-pagina";
import { TileMetrica } from "@/components/tile-metrica";
import {
  ControleRelogio,
  type SaltoRelogio,
} from "@/components/watchdog/controle-relogio";
import { EmailMonitor } from "@/components/watchdog/email-monitor";
import { LinhaObrigacao } from "@/components/watchdog/linha-obrigacao";
import { CONTRATO_SHOW } from "@/lib/demo/contratos";
import { dataCurta } from "@/lib/demo/formata";
import type { EmailDoMonitor } from "@/lib/demo/monitor";
import { contagens, type Linha } from "@/lib/demo/resolve";
import type { EstadoDemo } from "@/lib/demo/url";

/**
 * Passo 5: o tempo passa na frente de quem olha. O relogio injetavel sempre
 * existiu no motor; aqui ele ganha o controle na tela, e cada salto
 * re-renderiza o contrato inteiro contra o novo dia.
 */
export function Passo5({
  estado,
  linhas,
  email,
  saltos,
  hoje,
  relogioAtivo,
}: {
  estado: EstadoDemo;
  linhas: Linha[];
  email: EmailDoMonitor | null;
  saltos: SaltoRelogio[];
  hoje: string;
  relogioAtivo: boolean;
}) {
  const n = contagens(linhas);
  const proxima = linhas.find(
    (l) => !l.cumpridaEm && l.dias !== null && l.dias >= 0,
  );

  return (
    <Secao
      titulo="O monitor roda todo dia às 06:00"
      descricao="Uma demo dura cinco minutos e o produto vigia meses, então o tempo anda por aqui. Cada salto recalcula tudo contra o novo dia: o semáforo pinta, e a cobrança muda de valor porque o juro conta por dia."
    >
      <ControleRelogio
        estado={estado}
        saltos={saltos}
        agoraAtivo={estado.agora}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <TileMetrica
          rotulo="hoje, para o sistema"
          valor={dataCurta(hoje)}
          nota={relogioAtivo ? "relógio da demo" : "relógio real"}
        />
        <TileMetrica
          rotulo="ação nesta semana"
          valor={String(n.nestaSemana)}
          nota="vencendo em até 7 dias"
        />
        <TileMetrica
          rotulo="datas que já passaram"
          valor={String(n.vencidas)}
          nota={
            email
              ? "cobrança pronta ao lado"
              : n.cumpridas > 0
                ? "o que venceu consta como feito"
                : "nada vencido neste dia"
          }
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-papel px-5 shadow-papel">
          {linhas.map((l) => (
            <LinhaObrigacao key={l.id} linha={l} estado={estado} hoje={hoje} />
          ))}
        </div>

        {email ? (
          <EmailMonitor email={email} contrato={CONTRATO_SHOW} hoje={hoje} />
        ) : (
          <div className="flex flex-col gap-2 rounded-lg bg-papel p-6 shadow-papel">
            <p className="text-rotulo uppercase text-texto-tenue">
              monitor de hoje, {dataCurta(hoje)}
            </p>
            <p className="text-corpo text-texto">
              Nenhuma cobrança dispara neste dia.
              {n.cumpridas > 0
                ? " As parcelas que venceram constam como pagas."
                : ""}
              {proxima?.data
                ? ` A próxima data é ${proxima.titulo.toLowerCase()}, ${dataCurta(proxima.data)}, em ${proxima.dias} ${proxima.dias === 1 ? "dia" : "dias"}.`
                : ""}
            </p>
            <p className="text-ui text-texto-suave">
              Avance o relógio ali em cima e veja o e-mail aparecer.
            </p>
          </div>
        )}
      </div>
    </Secao>
  );
}
