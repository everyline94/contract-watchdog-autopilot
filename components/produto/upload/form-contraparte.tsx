"use client";

import * as React from "react";

import { BotaoAcao } from "@/components/botao-acao";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CanalNotificacao, Contraparte } from "@/lib/data/tipos";
import { cn } from "@/lib/utils";

/**
 * O formulario obrigatorio da conclusao: quem e a contraparte e por onde ela
 * quer ser cobrada. Sem isso o contrato nao nasce, porque contrato sem canal
 * de notificacao e planilha de novo.
 */
export function FormContraparte({
  tituloSugerido,
  enviando,
  aoConcluir,
}: {
  tituloSugerido: string;
  enviando: boolean;
  aoConcluir: (dados: { titulo: string; contraparte: Contraparte }) => void;
}) {
  const [titulo, setTitulo] = React.useState(tituloSugerido);
  const [nome, setNome] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [canal, setCanal] = React.useState<CanalNotificacao>("whatsapp");

  const completo =
    titulo.trim() && nome.trim() && email.trim() && telefone.trim();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!completo) return;
        aoConcluir({
          titulo,
          contraparte: { nome, email, telefone, canalPreferencial: canal },
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="titulo">Nome do contrato</Label>
        <Input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nome">Nome da contraparte</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Quem assina do outro lado"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pra onde vai a notificação"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(16) 99999-0000"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Canal preferencial</Label>
          <div className="flex items-center gap-2">
            {(["whatsapp", "email"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={canal === c}
                onClick={() => setCanal(c)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-ui font-medium transition-colors",
                  canal === c
                    ? "bg-tinta text-sobre-tinta"
                    : "border border-linha text-texto-suave hover:border-linha-campo",
                )}
              >
                {c === "whatsapp" ? "WhatsApp" : "Email"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        {/* Sempre clicavel: com campo faltando, o required do browser aponta
            qual e; botao apagado nao explica nada. */}
        <BotaoAcao type="submit" disabled={enviando} seta>
          Concluir e criar o contrato
        </BotaoAcao>
      </div>
    </form>
  );
}
