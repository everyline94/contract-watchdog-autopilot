"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { SeloConfianca } from "@/components/produto/selo-confianca";
import { SeloStatus } from "@/components/produto/selo-status";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Semaforo } from "@/components/watchdog/semaforo";
import type { ContratoResumo } from "@/lib/data/contratos";
import { dataCurta } from "@/lib/demo/formata";

type Ordem = "padrao" | "asc" | "desc";

const ICONE_ORDEM: Record<Ordem, React.ComponentType<{ className?: string }>> =
  {
    padrao: ArrowUpDown,
    asc: ArrowUp,
    desc: ArrowDown,
  };

/** A tabela da carteira. Linha inteira clicavel: leva pra ficha do contrato. */
export function TabelaContratos({
  contratos,
  vazioTitulo = "Nenhum contrato por aqui",
  vazioDetalhe = "Suba um PDF na fila de upload pra começar.",
  limparFiltroHref,
}: {
  contratos: ContratoResumo[];
  vazioTitulo?: string;
  vazioDetalhe?: string;
  limparFiltroHref?: string;
}) {
  const router = useRouter();
  const [busca, setBusca] = React.useState("");
  const [ordem, setOrdem] = React.useState<Ordem>("padrao");

  const visiveis = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    const filtrados = q
      ? contratos.filter(
          (c) =>
            c.titulo.toLowerCase().includes(q) ||
            c.contraparte.nome.toLowerCase().includes(q),
        )
      : contratos;
    if (ordem === "padrao") return filtrados;
    return [...filtrados].sort((a, b) => {
      if (!a.proximoVencimento && !b.proximoVencimento) return 0;
      if (!a.proximoVencimento) return 1;
      if (!b.proximoVencimento) return -1;
      const cmp = a.proximoVencimento.localeCompare(b.proximoVencimento);
      return ordem === "asc" ? cmp : -cmp;
    });
  }, [contratos, busca, ordem]);

  if (contratos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-linha-campo bg-papel px-6 py-12 text-center">
        <p className="text-corpo font-medium text-texto">{vazioTitulo}</p>
        <p className="text-ui text-texto-suave">{vazioDetalhe}</p>
        {limparFiltroHref ? (
          <Link
            href={limparFiltroHref}
            className="mt-1 text-ui font-medium text-brasa underline decoration-brasa/40 underline-offset-2 hover:decoration-brasa"
          >
            Limpar filtro
          </Link>
        ) : null}
      </div>
    );
  }

  const IconeOrdem = ICONE_ORDEM[ordem];

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por contraparte ou contrato"
        aria-label="Buscar por contraparte ou contrato"
        className="max-w-xs"
      />

      {visiveis.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-linha-campo bg-papel px-6 py-12 text-center">
          <p className="text-corpo font-medium text-texto">
            Nenhum contrato encontrado
          </p>
          <p className="text-ui text-texto-suave">
            Tente outro nome de contraparte ou de contrato.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-papel shadow-papel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contraparte</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  aria-sort={
                    ordem === "asc"
                      ? "ascending"
                      : ordem === "desc"
                        ? "descending"
                        : undefined
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOrdem(
                        ordem === "padrao"
                          ? "asc"
                          : ordem === "asc"
                            ? "desc"
                            : "padrao",
                      )
                    }
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-texto"
                  >
                    Próximo vencimento
                    <IconeOrdem className="size-3.5" aria-hidden />
                    <span className="sr-only">
                      , clique pra ordenar por vencimento
                    </span>
                  </button>
                </TableHead>
                <TableHead className="text-right">Confiança</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    // O link do titulo e a navegacao de verdade; o clique na
                    // linha e so conveniencia e nao pode atropelar o link.
                    if ((e.target as HTMLElement).closest("a")) return;
                    router.push(`/app/contratos/${c.id}`);
                  }}
                >
                  <TableCell>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-ui font-medium text-texto">
                        {c.contraparte.nome}
                      </span>
                      <span className="truncate text-rotulo text-texto-tenue">
                        {c.contraparte.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-64">
                    <Link
                      href={`/app/contratos/${c.id}`}
                      className="block truncate text-ui text-texto underline decoration-transparent underline-offset-2 transition-colors hover:decoration-linha-campo"
                    >
                      {c.titulo}
                    </Link>
                    <span className="font-mono text-rotulo text-texto-tenue tabular-nums">
                      {c.clausulasAbertas} de {c.clausulasTotal} cláusulas em aberto
                    </span>
                  </TableCell>
                  <TableCell>
                    <SeloStatus status={c.status} />
                  </TableCell>
                  <TableCell>
                    {c.proximoVencimento ? (
                      <span className="inline-flex items-center gap-2">
                        <Semaforo dias={c.diasProximo} />
                        <time className="font-mono text-rotulo text-texto-suave tabular-nums">
                          {dataCurta(c.proximoVencimento)}
                        </time>
                      </span>
                    ) : (
                      <span className="text-rotulo text-texto-tenue">
                        sem data em aberto
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <SeloConfianca
                      confianca={c.confiancaExtracao}
                      revisadoPor={c.revisadoPor}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
