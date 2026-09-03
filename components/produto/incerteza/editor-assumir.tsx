"use client";

import * as React from "react";

import { BotaoAcao } from "@/components/botao-acao";
import { SeloConfianca } from "@/components/produto/selo-confianca";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useResolveIncerteza } from "@/lib/data/hooks";
import type { ItemIncertezaDetalhado } from "@/lib/data/incerteza";
import { toast } from "sonner";

import { ROTULOS_MOTIVO } from "./motivos";

/**
 * O editor de "assumir no lugar da IA". Tres saidas, e so tres:
 * confirmar a leitura, corrigir o campo, ou descartar o item. Qualquer uma
 * tira o item da fila e recalcula o status do contrato.
 */
export function EditorAssumir({
  item,
  aoFechar,
}: {
  item: ItemIncertezaDetalhado | null;
  aoFechar: () => void;
}) {
  if (!item) return null;
  // O key remonta o editor a cada item: o estado nasce preenchido, sem effect.
  return <EditorAberto key={item.id} item={item} aoFechar={aoFechar} />;
}

function EditorAberto({
  item,
  aoFechar,
}: {
  item: ItemIncertezaDetalhado;
  aoFechar: () => void;
}) {
  const resolver = useResolveIncerteza();

  const [interpretacao, setInterpretacao] = React.useState(
    item.clausula?.resumoSimplificado ?? item.interpretacaoSugerida,
  );
  const [dataLimite, setDataLimite] = React.useState(
    item.clausula?.dataLimite ?? "",
  );
  const [valor, setValor] = React.useState(
    item.clausula?.valorCentavos
      ? String(item.clausula.valorCentavos / 100).replace(".", ",")
      : "",
  );

  const decide = (decisao: "confirmar" | "corrigir" | "descartar") => {
    // Formato pt-BR: ponto e milhar, virgula e decimal ("4.800,50").
    const centavos = valor.trim()
      ? Math.round(Number(valor.replace(/\./g, "").replace(",", ".")) * 100)
      : null;
    if (decisao === "corrigir" && centavos !== null && Number.isNaN(centavos)) {
      toast.error("Valor inválido. Use números, tipo 4800 ou 4800,50.");
      return;
    }
    resolver.mutate(
      {
        itemId: item.id,
        decisao,
        interpretacao,
        dataLimite: dataLimite || null,
        valorCentavos: centavos,
      },
      {
        onSuccess: (r) => {
          if (!r.ok) {
            toast.error(r.erro);
            return;
          }
          toast.success(
            decisao === "descartar"
              ? "Item descartado da fila."
              : "Você assumiu no lugar da IA. O status do contrato foi recalculado.",
          );
          aoFechar();
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Assumir no lugar da IA</DialogTitle>
          <DialogDescription>
            {item.contratoTitulo}, motivo: {ROTULOS_MOTIVO[item.motivo]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-rotulo text-texto-tenue uppercase">
              trecho bruto do PDF
            </p>
            <blockquote className="rounded-md border-l-2 border-linha-campo bg-papel-fundo px-3 py-2 font-mono text-ui text-texto-suave">
              {item.trechoBruto}
            </blockquote>
            {item.paginaPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.paginaPreviewUrl}
                alt="Página do PDF como ela chegou"
                className="max-h-56 w-full rounded-md border border-linha object-cover object-top"
              />
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-rotulo text-texto-tenue uppercase">
              leitura sugerida pela IA
            </p>
            <SeloConfianca confianca={item.confianca} revisadoPor="ia" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="interpretacao">Como o campo deve ser lido</Label>
            <Textarea
              id="interpretacao"
              value={interpretacao}
              onChange={(e) => setInterpretacao(e.target.value)}
              rows={3}
            />
          </div>

          {item.clausula ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dataLimite">Data limite, se houver</Label>
                <Input
                  id="dataLimite"
                  type="date"
                  value={dataLimite}
                  onChange={(e) => setDataLimite(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="valor">Valor em reais, se houver</Label>
                <Input
                  id="valor"
                  inputMode="decimal"
                  placeholder="4800,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Button
            variant="ghost"
            className="text-queda"
            disabled={resolver.isPending}
            onClick={() => decide("descartar")}
          >
            Descartar item
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={resolver.isPending}
              onClick={() => decide("confirmar")}
            >
              A IA leu certo
            </Button>
            <BotaoAcao
              disabled={resolver.isPending}
              onClick={() => decide("corrigir")}
            >
              Salvar correção
            </BotaoAcao>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
