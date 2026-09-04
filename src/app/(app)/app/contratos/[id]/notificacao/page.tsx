"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";

import {
  CabecalhoPagina,
  ContainerPagina,
} from "@/components/blocos-pagina";
import { MolduraEmail } from "@/components/produto/notificacao/moldura-email";
import { MolduraWhatsapp } from "@/components/produto/notificacao/moldura-whatsapp";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotificacao } from "@/lib/data/hooks";

export default function PaginaNotificacao() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending } = useNotificacao(id);

  if (isPending) {
    return (
      <ContainerPagina medida="media" className="flex flex-col gap-8 py-8">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </ContainerPagina>
    );
  }

  if (!data) {
    return (
      <ContainerPagina className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-h3 font-semibold text-texto">
          Contrato não encontrado
        </p>
        <Link
          href="/app"
          className="text-ui font-medium text-brasa underline decoration-brasa/40 underline-offset-2 hover:decoration-brasa"
        >
          Voltar pro dashboard
        </Link>
      </ContainerPagina>
    );
  }

  return (
    <ContainerPagina medida="media" className="flex flex-col gap-8 py-8">
      <CabecalhoPagina
        sobretitulo={
          <Link
            href={`/app/contratos/${data.contratoId}`}
            className="underline decoration-dotted underline-offset-2 hover:text-texto-suave"
          >
            voltar pro contrato
          </Link>
        }
        titulo="Como a contraparte recebe"
        descricao={
          <>
            Simulação fiel do canal, sem envio real nesta etapa. O canal
            preferencial de {data.contraparte.nome.split(" ")[0]} é{" "}
            {data.canalPreferencial === "whatsapp" ? "WhatsApp" : "email"}. As
            respostas da contraparte registram na timeline e mudam o status
            das cláusulas de verdade.
          </>
        }
      />

      <Tabs defaultValue={data.canalPreferencial}>
        <TabsList>
          <TabsTrigger value="email" className="px-4">
            Email
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="px-4">
            WhatsApp
          </TabsTrigger>
        </TabsList>
        <TabsContent value="email" className="pt-4">
          <MolduraEmail notificacao={data} />
        </TabsContent>
        <TabsContent value="whatsapp" className="pt-4">
          <MolduraWhatsapp notificacao={data} />
        </TabsContent>
      </Tabs>

      <p className="text-ui text-texto-suave">
        O link que iria na mensagem abre a página pública, sem nada do painel:{" "}
        <Link
          href={`/c/${data.tokenPublico}`}
          className="font-mono text-brasa underline decoration-brasa/40 underline-offset-2 hover:decoration-brasa"
        >
          /c/{data.tokenPublico}
        </Link>
      </p>
    </ContainerPagina>
  );
}
