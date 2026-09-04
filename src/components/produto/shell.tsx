"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  FileUp,
  LayoutDashboard,
  Mail,
  MessageCircle,
  UserRoundSearch,
} from "lucide-react";

import { ContainerPagina } from "@/components/blocos-pagina";
import { MarcaRevelio } from "@/components/produto/marca-revelio";
import { ToggleTema } from "@/components/tema";
import { useIncerteza } from "@/lib/data/hooks";
import type { Sessao } from "@/lib/data/tipos";
import { cn } from "@/lib/utils";

/**
 * A moldura do produto: sidebar fixa no desktop, barra compacta no mobile.
 * Mesmo esqueleto da demo (grid 272px + papel + linha), outra navegacao.
 */

const ITENS = [
  { href: "/app", rotulo: "Dashboard", icone: LayoutDashboard },
  { href: "/app/upload", rotulo: "Fila de upload", icone: FileUp },
  { href: "/app/incerteza", rotulo: "Fila de incerteza", icone: UserRoundSearch },
  { href: "/app/whatsapp", rotulo: "Contraparte no WhatsApp", icone: MessageCircle },
  { href: "/app/email", rotulo: "Contraparte no email", icone: Mail },
] as const;

function ativo(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

function ItemNav({
  href,
  rotulo,
  icone: Icone,
  atual,
  pastilha,
}: {
  href: string;
  rotulo: string;
  icone: React.ComponentType<{ className?: string }>;
  atual: boolean;
  pastilha?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={atual ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        atual
          ? "bg-tinta text-sobre-tinta"
          : "text-texto-suave hover:bg-papel-fundo hover:text-texto",
      )}
    >
      <Icone className="size-4 shrink-0" />
      <span className="text-ui font-medium">{rotulo}</span>
      {pastilha ? (
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 font-mono text-rotulo tabular-nums",
            atual ? "bg-sobre-tinta/16 text-sobre-tinta" : "bg-brasa/12 text-brasa",
          )}
        >
          {pastilha}
        </span>
      ) : null}
    </Link>
  );
}

export function ShellProduto({
  sessao,
  children,
}: {
  sessao: Sessao;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: incertezas } = useIncerteza();
  const abertas = incertezas?.length ?? 0;

  return (
    <div className="min-h-dvh bg-mesa lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 overflow-y-auto border-r border-linha bg-papel px-4 py-6 lg:flex">
        <Link href="/app" className="block px-3 pt-1">
          <MarcaRevelio fluida />
          <span className="sr-only">Revelio, início</span>
        </Link>

        <nav aria-label="Navegação do produto" className="flex flex-col gap-1">
          {ITENS.map((item) => (
            <ItemNav
              key={item.href}
              {...item}
              atual={ativo(pathname, item.href)}
              pastilha={item.href === "/app/incerteza" ? abertas : undefined}
            />
          ))}
        </nav>

        <div className="border-t border-linha pt-4">
          <Link
            href="/"
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-ui font-medium text-texto-suave transition-colors hover:bg-papel-fundo hover:text-texto"
          >
            Demo guiada
            <span className="text-rotulo uppercase text-texto-tenue">sair</span>
          </Link>
        </div>

        <div className="mt-auto flex flex-col gap-3 px-3">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-ui font-medium text-texto">
              {sessao.usuario.nome}
            </span>
            <span className="truncate text-rotulo text-texto-tenue">
              {sessao.usuario.email}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-rotulo text-texto-tenue uppercase">tema</span>
            <ToggleTema />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-b border-linha bg-papel lg:hidden">
          <ContainerPagina className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
            <Link href="/app" className="inline-flex items-center">
              <MarcaRevelio altura="h-6" />
              <span className="sr-only">Revelio, início</span>
            </Link>
            <ToggleTema />
          </ContainerPagina>
          <ContainerPagina className="flex items-center gap-4 pb-4">
            {ITENS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo(pathname, item.href) ? "page" : undefined}
                className={cn(
                  "text-ui font-medium transition-colors",
                  ativo(pathname, item.href)
                    ? "text-texto underline underline-offset-4"
                    : "text-texto-suave hover:text-texto",
                )}
              >
                {item.rotulo}
                {item.href === "/app/incerteza" && abertas ? (
                  <span className="ml-1.5 rounded-full bg-brasa/12 px-1.5 py-0.5 font-mono text-rotulo text-brasa tabular-nums">
                    {abertas}
                  </span>
                ) : null}
              </Link>
            ))}
          </ContainerPagina>
        </header>

        <main className="flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
