import Link from "next/link";

import { ContainerPagina } from "@/components/blocos-pagina";
import { Marca } from "@/components/marca";
import { ToggleTema } from "@/components/tema";
import { Leitor } from "@/components/watchdog/leitor";

/**
 * A pagina do leitor ao vivo: o produto de verdade, sem roteiro.
 * Sobe qualquer contrato em PDF e ve a leitura acontecer.
 */
export const metadata = { title: "Ler um contrato · Revelio" };

export default function PaginaLer() {
  // Na nuvem o leitor so liga quando o AI Gateway tiver creditos (cartao na
  // conta). Ate la, o ao vivo roda na maquina de quem apresenta.
  const leitorLigado =
    !process.env.VERCEL || process.env.MOTOR_LEITURA === "gateway";
  return (
    <main className="min-h-dvh bg-mesa pb-16">
      <header className="border-b border-linha bg-papel">
        <ContainerPagina className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
          <span className="inline-flex items-center gap-2.5">
            <Marca simbolo tamanho="sm" />
            <span className="text-corpo font-semibold tracking-tight">
              Revelio
            </span>
            <span className="rounded-full bg-pigmento px-2.5 py-1 text-rotulo uppercase text-sobre-pigmento">
              ao vivo
            </span>
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-ui text-brasa underline decoration-brasa/40 underline-offset-2 hover:decoration-brasa"
            >
              voltar para a demo guiada
            </Link>
            <ToggleTema />
          </div>
        </ContainerPagina>
      </header>

      <ContainerPagina medida="media" className="flex flex-col gap-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 font-semibold tracking-tight">
            Leia um contrato agora
          </h1>
          <p className="text-lede text-texto-suave">
            Sem roteiro: o modelo lê o documento e devolve cada campo com a
            cláusula de origem, um verificador confere cada citação contra a
            página, e o motor calcula as datas que não estão escritas.
          </p>
        </div>
        {leitorLigado ? (
          <Leitor />
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl bg-papel p-8 shadow-papel">
            <p className="text-corpo text-texto">
              O leitor ao vivo roda na máquina da apresentação, pela conta
              local do Claude, sem custo de API. Nesta versão pública ele fica
              desligado: entra no ar quando a chave de API for ligada, na hora
              de vender.
            </p>
            <p className="text-corpo text-texto-suave">
              Enquanto isso, a demo guiada ao lado mostra o mesmo motor
              rodando de verdade sobre contratos já lidos.
            </p>
          </div>
        )}
      </ContainerPagina>
    </main>
  );
}
