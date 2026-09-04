"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { LogoGoogle, LogoMicrosoft } from "@/components/produto/logos-marca";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAgenda, useSincronizaAgenda } from "@/lib/data/hooks";
import type { ProvedorAgenda } from "@/lib/data/tipos";
import { dataCurta } from "@/lib/demo/formata";
import { cn } from "@/lib/utils";

/**
 * "Enviar datas pra agenda": a acao secundaria da ficha. A primaria segue
 * sendo a pilula preta do "Gerar notificacao", e continua sozinha la em cima.
 *
 * A sincronizacao e simulada e a tela diz isso. O que nao e simulado e a
 * conta: o total vem da regra pura contaObrigacoesComData, sobre as clausulas
 * deste contrato.
 */

const OPCOES: {
  provedor: ProvedorAgenda;
  nome: string;
  nota: string;
  Logo: (p: { className?: string }) => React.ReactElement;
}[] = [
  {
    provedor: "google-agenda",
    nome: "Google Agenda",
    nota: "conta Google",
    Logo: LogoGoogle,
  },
  {
    provedor: "outlook",
    nome: "Outlook",
    nota: "conta Microsoft",
    Logo: LogoMicrosoft,
  },
];

const plural = (n: number) => (n === 1 ? "obrigação" : "obrigações");

export function AcaoAgenda({
  contratoId,
  obrigacoesComData,
}: {
  contratoId: string;
  obrigacoesComData: number;
}) {
  const [aberto, setAberto] = React.useState(false);
  const { data: agenda } = useAgenda(contratoId);
  const sincroniza = useSincronizaAgenda();

  // O toast dispara na VIRADA pra sincronizada, nao no clique: quem fecha a
  // sincronizacao e o servidor, e o hook so descobre no poll seguinte.
  const anterior = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (!agenda) return;
    if (anterior.current === "sincronizando" && agenda.estado === "sincronizada") {
      toast.success(
        `${agenda.total} ${plural(agenda.total)} na sua agenda. Sincronização simulada nesta etapa.`,
      );
    }
    anterior.current = agenda.estado;
  }, [agenda]);

  const sincronizando =
    agenda?.estado === "sincronizando" || sincroniza.isPending;
  // Contrato sem nada em aberto com data nao tem o que mandar. Melhor dizer
  // isso do que sincronizar zero evento e cantar vitoria.
  const vazio = obrigacoesComData === 0;
  const escolhido = sincroniza.variables?.provedor ?? agenda?.provedor ?? null;

  return (
    <>
      <Button variant="outline" onClick={() => setAberto(true)}>
        <CalendarDays data-icon="inline-start" aria-hidden />
        Enviar datas pra agenda
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar datas pra agenda</DialogTitle>
            <DialogDescription>
              {vazio
                ? "Nada em aberto com data neste contrato. Assim que uma obrigação com prazo entrar, ela vai pra agenda."
                : `${obrigacoesComData} ${plural(obrigacoesComData)} em aberto com data neste contrato. Cada uma vira um evento no dia do vencimento.`}
            </DialogDescription>
          </DialogHeader>

          {agenda?.estado === "sincronizada" && agenda.provedor ? (
            <p className="rounded-lg bg-papel-fundo px-4 py-3 text-ui text-texto">
              <span className="font-medium">
                {agenda.total} {plural(agenda.total)}
              </span>{" "}
              {agenda.total === 1 ? "foi" : "foram"} pro{" "}
              {OPCOES.find((o) => o.provedor === agenda.provedor)?.nome}
              {agenda.quando
                ? `, em ${dataCurta(agenda.quando.slice(0, 10))}`
                : ""}
              . Pode sincronizar de novo quando as datas mudarem.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {OPCOES.map((opcao) => {
              const atual = escolhido === opcao.provedor;
              const conectada = agenda?.estado === "sincronizada" && atual;
              return (
                <button
                  key={opcao.provedor}
                  type="button"
                  disabled={sincronizando || vazio}
                  onClick={() =>
                    sincroniza.mutate({ contratoId, provedor: opcao.provedor })
                  }
                  className={cn(
                    "flex items-center gap-3 rounded-lg border bg-papel px-3 py-3 text-left transition-colors",
                    "hover:border-texto-suave disabled:pointer-events-none disabled:opacity-60",
                    conectada ? "border-pigmento" : "border-linha-campo",
                  )}
                >
                  <opcao.Logo className="size-5 shrink-0" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-ui font-medium text-texto">
                      {opcao.nome}
                    </span>
                    <span className="truncate text-rotulo text-texto-tenue">
                      {sincronizando && atual
                        ? "sincronizando"
                        : conectada
                          ? "conectada"
                          : opcao.nota}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <DialogFooter className="sm:items-center sm:justify-between">
            <p className="text-rotulo text-texto-tenue">
              Simulação de UI, sem envio real.
            </p>
            <DialogClose render={<Button variant="outline" />}>
              Fechar
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** O selo da ficha: so aparece depois que a agenda foi sincronizada. */
export function SeloAgenda({ contratoId }: { contratoId: string }) {
  const { data: agenda } = useAgenda(contratoId);
  if (agenda?.estado !== "sincronizada" || !agenda.provedor) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-linha px-2.5 py-1 font-mono text-rotulo text-texto-suave">
      <span className="size-1.5 rounded-full bg-pigmento" aria-hidden />
      agenda conectada
    </span>
  );
}
