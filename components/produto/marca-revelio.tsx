import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A logo da Revelio: simbolo + wordmark, direto dos SVGs oficiais da marca.
 * O par de arquivos troca com o tema (tinta preta no claro, clara no escuro),
 * porque o wordmark e desenho fechado, nao texto que herda cor.
 */
export function MarcaRevelio({
  altura = "h-6",
  fluida = false,
  className,
}: {
  /** Classe de altura Tailwind; a largura segue a proporcao do desenho. */
  altura?: string;
  /** Ocupa a largura do pai (altura acompanha): pro topo da sidebar. */
  fluida?: boolean;
  className?: string;
}) {
  const medida = fluida ? "w-full h-auto" : cn(altura, "w-auto");
  return (
    <span
      className={cn(
        "inline-flex items-center",
        fluida && "w-full",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marca/revelio-preto.svg"
        alt="Revelio"
        className={cn(medida, "dark:hidden")}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marca/revelio-branco.svg"
        alt="Revelio"
        className={cn(medida, "hidden dark:inline")}
      />
    </span>
  );
}
