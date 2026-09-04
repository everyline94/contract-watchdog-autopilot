"use client";

import * as React from "react";

import { BotaoAcao } from "@/components/botao-acao";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRegistraResposta } from "@/lib/data/hooks";
import type { Notificacao } from "@/lib/data/notificacoes";
import type { AcaoContraparte } from "@/lib/data/tipos";
import { toast } from "sonner";

/**
 * As tres acoes da contraparte: aceite, nao aceite, quero falar com alguem.
 * As duas ultimas abrem justificativa obrigatoria. Toda resposta registra na
 * timeline e mexe no status da clausula.
 */
export function AcoesContraparte({
  notificacao,
}: {
  notificacao: Notificacao;
}) {
  const registrar = useRegistraResposta();
  const [pendente, setPendente] = React.useState<Exclude<
    AcaoContraparte,
    "aceite"
  > | null>(null);
  const [justificativa, setJustificativa] = React.useState("");

  const ultima = notificacao.respostas[notificacao.respostas.length - 1];

  const envia = (acao: AcaoContraparte) => {
    registrar.mutate(
      {
        tokenPublico: notificacao.tokenPublico,
        acao,
        justificativa: acao === "aceite" ? undefined : justificativa,
      },
      {
        onSuccess: (r) => {
          if (!r.ok) {
            toast.error(r.erro);
            return;
          }
          toast.success(
            acao === "aceite"
              ? "Aceite registrado. Obrigado!"
              : acao === "nao_aceite"
                ? "Resposta registrada. Vamos revisar e voltar pra você."
                : "Pedido registrado. Alguém entra em contato ainda hoje.",
          );
          setPendente(null);
          setJustificativa("");
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {ultima ? (
        <p className="rounded-md bg-papel-fundo px-3 py-2 text-rotulo text-texto-suave">
          Última resposta registrada:{" "}
          {ultima.acao === "aceite"
            ? "aceite"
            : ultima.acao === "nao_aceite"
              ? "não aceite"
              : "pedido de contato"}
          {ultima.justificativa ? `, "${ultima.justificativa}"` : ""}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <BotaoAcao
          disabled={registrar.isPending}
          onClick={() => {
            setPendente(null);
            envia("aceite");
          }}
        >
          Aceito
        </BotaoAcao>
        <Button
          variant="outline"
          disabled={registrar.isPending}
          onClick={() => setPendente("nao_aceite")}
        >
          Não aceito
        </Button>
        <Button
          variant="outline"
          disabled={registrar.isPending}
          onClick={() => setPendente("contato")}
        >
          Quero falar com alguém
        </Button>
      </div>

      {pendente ? (
        <div className="flex flex-col gap-2 rounded-md bg-papel-fundo p-3">
          <label
            htmlFor="justificativa"
            className="text-rotulo text-texto-suave"
          >
            {pendente === "nao_aceite"
              ? "Conta o que você não aceita, pra gente encaminhar certo:"
              : "Conta rapidinho o assunto, pra pessoa certa te ligar:"}
          </label>
          <Textarea
            id="justificativa"
            rows={3}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPendente(null)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!justificativa.trim() || registrar.isPending}
              onClick={() => envia(pendente)}
            >
              Enviar resposta
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
