import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A pagina real do contrato com a clausula destacada, pre-renderizada em
 * public/evidencias. Imagem pronta nao falha no palco.
 */
export function PaginaDestacada({
  nome,
  alt,
  className,
}: {
  /** Basename em /public/evidencias, sem extensao. */
  nome: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/evidencias/${nome}.png`}
      alt={alt}
      width={1191}
      height={1684}
      className={cn(
        "h-auto w-full rounded-lg border border-linha bg-white shadow-papel",
        className,
      )}
    />
  );
}
