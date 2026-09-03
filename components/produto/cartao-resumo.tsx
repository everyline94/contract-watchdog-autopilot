import Link from "next/link";
import * as React from "react";
import { UserRoundSearch } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * O card de resumo do dashboard: a anatomia do TileMetrica, so que clicavel e
 * com estado de selecao, porque cada card e um filtro da lista.
 *
 * A variante de incerteza e deliberadamente outra coisa: borda de brasa e
 * icone de gente, porque ali nao e um numero de carteira, e o ponto onde um
 * humano precisa entrar.
 *
 * O clique principal e um link esticado (overlay) pra permitir um link
 * secundario dentro do card sem aninhar anchor em anchor.
 */
export function CartaoResumo({
  rotulo,
  valor,
  href,
  selecionado = false,
  destaqueIncerteza = false,
  nota,
  linkSecundario,
  className,
}: {
  rotulo: string;
  valor: number;
  href: string;
  selecionado?: boolean;
  destaqueIncerteza?: boolean;
  nota?: string;
  linkSecundario?: { href: string; rotulo: string };
  className?: string;
}) {
  return (
    <div
      data-slot="cartao-resumo"
      className={cn(
        "relative flex flex-col gap-2.5 rounded-lg bg-papel p-5 shadow-papel transition-shadow hover:shadow-flutuante",
        selecionado && "ring-2 ring-tinta",
        destaqueIncerteza && "border border-brasa/40 bg-brasa/4",
        destaqueIncerteza && selecionado && "ring-brasa",
        className,
      )}
    >
      <Link
        href={href}
        aria-current={selecionado ? "true" : undefined}
        className="flex flex-col gap-2.5 outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
      >
        <p
          className={cn(
            "flex items-center gap-1.5 text-rotulo uppercase",
            destaqueIncerteza ? "text-brasa" : "text-texto-tenue",
          )}
        >
          {destaqueIncerteza ? (
            <UserRoundSearch className="size-3.5" aria-hidden />
          ) : null}
          {rotulo}
        </p>
        <p
          className={cn(
            "font-mono text-h3 leading-none font-semibold tracking-[-0.045em] tabular-nums",
            destaqueIncerteza && "text-brasa",
          )}
        >
          {valor}
        </p>
      </Link>
      {nota ? <p className="text-rotulo text-texto-tenue">{nota}</p> : null}
      {linkSecundario ? (
        <Link
          href={linkSecundario.href}
          className="relative z-10 w-fit text-rotulo text-texto-suave underline decoration-dotted underline-offset-2 transition-colors hover:text-texto"
        >
          {linkSecundario.rotulo}
        </Link>
      ) : null}
    </div>
  );
}
