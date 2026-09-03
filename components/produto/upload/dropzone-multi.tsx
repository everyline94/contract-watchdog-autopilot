"use client";

import * as React from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAdicionaArquivos } from "@/lib/data/hooks";
import {
  ACCEPT_ARQUIVOS,
  ROTULO_FORMATOS,
  arquivoAceito,
} from "@/lib/data/tipos";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * A dropzone da fila: multi-arquivo, PDF e Word. O arquivo em si nao sobe
 * nesta etapa (a leitura e simulada); o nome entra na fila e o resto do fluxo
 * e identico ao real.
 *
 * A zona inteira aceita clique por conveniencia, mas quem carrega a acao e um
 * botao de verdade: arrastar nao pode ser o unico caminho, e teclado precisa
 * chegar no mesmo lugar que o mouse.
 */
export function DropzoneMulti() {
  const adicionar = useAdicionaArquivos();
  const [arrastando, setArrastando] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sem isto o browser navega pro arquivo quando o drop erra o alvo.
  React.useEffect(() => {
    const bloqueia = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", bloqueia);
    window.addEventListener("drop", bloqueia);
    return () => {
      window.removeEventListener("dragover", bloqueia);
      window.removeEventListener("drop", bloqueia);
    };
  }, []);

  const recebe = (lista: FileList | null) => {
    if (!lista || lista.length === 0) return;
    const aceitos = Array.from(lista).filter((f) => arquivoAceito(f.name));
    const recusados = lista.length - aceitos.length;
    if (recusados > 0) {
      toast.error(
        recusados === 1
          ? `1 arquivo ignorado: só ${ROTULO_FORMATOS} entra na fila.`
          : `${recusados} arquivos ignorados: só ${ROTULO_FORMATOS} entra na fila.`,
      );
    }
    if (aceitos.length === 0) return;
    adicionar.mutate(
      aceitos.map((f) => f.name),
      {
        onSuccess: () =>
          toast.success(
            aceitos.length === 1
              ? "1 contrato na fila."
              : `${aceitos.length} contratos na fila.`,
          ),
      },
    );
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragEnter={() => setArrastando(true)}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        recebe(e.dataTransfer.files);
      }}
      className={cn(
        "flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
        arrastando
          ? "border-brasa bg-brasa/4"
          : "border-linha-campo bg-papel hover:border-texto-suave",
      )}
    >
      <p className="text-corpo font-semibold text-texto">
        Solte contratos aqui, ou escolha do computador
      </p>
      <p className="text-ui text-texto-suave">
        {ROTULO_FORMATOS}, vários de uma vez. Cada arquivo vira um item da fila
        com as etapas à vista: upload, leitura, extração, revisão e conclusão.
      </p>
      <Button
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
      >
        <Upload data-icon="inline-start" aria-hidden />
        Escolher arquivos
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ARQUIVOS}
        multiple
        hidden
        onChange={(e) => {
          recebe(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
