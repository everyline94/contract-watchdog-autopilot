import type { Metadata } from "next";

import { Provedores } from "@/components/produto/provedores";
import { ShellProduto } from "@/components/produto/shell";
import { sessaoAtual } from "@/lib/data/sessao";

/**
 * O layout do produto. Quando o auth entrar, o middleware guarda o segmento
 * /app inteiro e a sessao mockada de src/lib/data/sessao.ts vira a real; este
 * arquivo nao muda de formato.
 */

export const metadata: Metadata = {
  title: "Revelio · Painel",
};

export default async function LayoutProduto({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await sessaoAtual();
  return (
    <Provedores>
      <ShellProduto sessao={sessao}>{children}</ShellProduto>
    </Provedores>
  );
}
