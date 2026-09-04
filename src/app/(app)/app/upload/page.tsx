"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import {
  CabecalhoPagina,
  ContainerPagina,
  Secao,
} from "@/components/blocos-pagina";
import { DropzoneMulti } from "@/components/produto/upload/dropzone-multi";
import { ItemFila } from "@/components/produto/upload/item-fila";
import { PainelConectores } from "@/components/produto/upload/painel-conectores";
import { PainelResultado } from "@/components/produto/upload/painel-resultado";
import { Skeleton } from "@/components/ui/skeleton";
import { useFilaUpload } from "@/lib/data/hooks";

export default function PaginaUpload() {
  const router = useRouter();
  const { data: fila, isPending, isError, refetch } = useFilaUpload();
  const [revisandoId, setRevisandoId] = React.useState<string | null>(null);

  // O painel so existe enquanto o item esta em revisao: estado derivado, nao
  // setado. E a conclusao e observada AQUI, nao no callback do mutate: a
  // invalidacao desmonta o painel antes do onSuccess dele rodar, e o
  // redirect se perderia.
  const itemRevisando = (fila ?? []).find((i) => i.id === revisandoId);
  const concluidoId =
    itemRevisando?.etapa === "concluido" ? itemRevisando.contratoId : null;

  React.useEffect(() => {
    if (!concluidoId) return;
    toast.success("Contrato criado. O monitor assume daqui.");
    router.push(`/app/contratos/${concluidoId}`);
  }, [concluidoId, router]);

  return (
    <ContainerPagina className="flex flex-col gap-8 py-8">
      <CabecalhoPagina
        sobretitulo="entrada"
        titulo="Fila de upload"
        descricao="Solte os contratos e acompanhe cada um pelas etapas. No fim, você diz quem é a contraparte e o contrato entra na carteira."
      />

      <DropzoneMulti />

      <PainelConectores />

      <Secao
        titulo="Na fila"
        descricao="Do mais novo pro mais antigo. Item em revisão espera você; o resto anda sozinho."
      >
        {isPending ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-linha-campo bg-papel px-6 py-12 text-center">
            <p className="text-corpo font-medium text-texto">
              Não conseguimos carregar a fila
            </p>
            <button
              onClick={() => refetch()}
              className="text-ui font-medium text-brasa underline decoration-brasa/40 underline-offset-2 hover:decoration-brasa"
            >
              Tentar de novo
            </button>
          </div>
        ) : (fila ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-linha-campo bg-papel px-6 py-10 text-center text-ui text-texto-suave">
            Fila vazia. O primeiro PDF que você soltar aparece aqui.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {(fila ?? []).map((item) => (
              <React.Fragment key={item.id}>
                <ItemFila
                  item={item}
                  revisando={revisandoId === item.id && item.etapa === "revisao"}
                  aoRevisar={() =>
                    setRevisandoId(revisandoId === item.id ? null : item.id)
                  }
                />
                {revisandoId === item.id && item.etapa === "revisao" ? (
                  <PainelResultado itemId={item.id} />
                ) : null}
              </React.Fragment>
            ))}
          </div>
        )}
      </Secao>
    </ContainerPagina>
  );
}
