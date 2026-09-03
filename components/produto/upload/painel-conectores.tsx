"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import { Secao } from "@/components/blocos-pagina";
import { LogoGoogleDrive, LogoOneDrive } from "@/components/produto/logos-marca";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useConectaProvedor,
  useConectores,
  useImportaArquivo,
} from "@/lib/data/hooks";
import type { Conector, ProvedorConector } from "@/lib/data/tipos";

/**
 * Os conectores de importacao, embaixo do dropzone.
 *
 * A sacada e que o arquivo importado nao vai pra lugar nenhum novo: ele cai na
 * MESMA fila do dropzone e anda sozinho pelas mesmas etapas, com o mesmo
 * contador. A conexao e simulada; o pipeline depois dela e o de verdade.
 */

const MARCAS: Record<
  ProvedorConector,
  { nome: string; onde: string; Logo: (p: { className?: string }) => React.ReactElement }
> = {
  "google-drive": {
    nome: "Google Drive",
    onde: "Meu Drive",
    Logo: LogoGoogleDrive,
  },
  onedrive: {
    nome: "Microsoft OneDrive",
    onde: "Documentos",
    Logo: LogoOneDrive,
  },
};

function CartaoConector({ conector }: { conector: Conector }) {
  const conecta = useConectaProvedor();
  const importa = useImportaArquivo();
  const marca = MARCAS[conector.provedor];

  // O "conectando" vem do store, nao do botao: o poll do hook e quem vira a
  // chave. O isPending so cobre a ida do clique ate o servidor responder.
  const conectando =
    conector.estado === "conectando" ||
    (conecta.isPending && conecta.variables === conector.provedor);
  const importandoId =
    importa.isPending && importa.variables?.provedor === conector.provedor
      ? importa.variables.arquivoId
      : null;

  return (
    <article className="flex flex-col gap-4 rounded-lg bg-papel p-5 shadow-papel">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <span className="flex min-w-0 items-center gap-3">
          <marca.Logo className="size-7 shrink-0" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-corpo font-semibold text-texto">
              {marca.nome}
            </span>
            <span className="truncate text-rotulo text-texto-tenue">
              {conector.estado === "conectado" && conector.conta
                ? conector.conta
                : marca.onde}
            </span>
          </span>
        </span>

        {conector.estado === "conectado" ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-linha px-2.5 py-1 font-mono text-rotulo text-texto-suave">
            <span className="size-1.5 rounded-full bg-pigmento" aria-hidden />
            conectado
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={conectando}
            onClick={() => conecta.mutate(conector.provedor)}
          >
            {conectando ? "Conectando" : "Conectar"}
          </Button>
        )}
      </header>

      {conector.estado === "conectado" ? (
        conector.arquivos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-linha-campo px-4 py-6 text-center text-ui text-texto-suave">
            Nada novo nesta pasta. O que estava aqui já está na fila.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {conector.arquivos.map((arquivo) => (
              <li
                key={arquivo.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg bg-papel-fundo px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText
                    className="size-4 shrink-0 text-texto-tenue"
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-mono text-ui text-texto">
                      {arquivo.nome}
                    </span>
                    <span className="truncate text-rotulo text-texto-tenue">
                      {arquivo.pasta} · {arquivo.tamanho}
                    </span>
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={importandoId === arquivo.id}
                  onClick={() =>
                    importa.mutate(
                      { provedor: conector.provedor, arquivoId: arquivo.id },
                      {
                        onSuccess: (r) =>
                          r.ok
                            ? toast.success(
                                `${r.nomeArquivo} entrou na fila. A leitura já começou.`,
                              )
                            : toast.error(r.erro),
                      },
                    )
                  }
                >
                  {importandoId === arquivo.id
                    ? "Importando"
                    : "Importar pra fila"}
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="text-ui text-texto-suave">
          {conectando
            ? "Abrindo a conta e listando os PDFs da pasta."
            : "Ligue a conta pra ver os contratos que já estão lá e mandar pra fila sem baixar nada."}
        </p>
      )}
    </article>
  );
}

export function PainelConectores() {
  const { data, isPending } = useConectores();

  return (
    <Secao
      titulo="Importar de onde os contratos já estão"
      descricao="Ligue a conta e traga o PDF direto da pasta. O arquivo importado cai nesta mesma fila e anda pelas mesmas etapas. Conexão simulada nesta etapa, sem acesso real à conta."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {isPending
          ? [0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)
          : (data ?? []).map((conector) => (
              <CartaoConector key={conector.provedor} conector={conector} />
            ))}
      </div>
    </Secao>
  );
}
