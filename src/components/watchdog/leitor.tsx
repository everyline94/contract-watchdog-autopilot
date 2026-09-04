"use client";

/**
 * O leitor ao vivo: sobe um PDF, acompanha as quatro leituras acontecendo e
 * recebe o calendario calculado, com toda citacao conferida contra a pagina.
 *
 * A espera e parte da cena: o stream NDJSON da rota vira uma regua de
 * progresso honesta, familia a familia, com o relogio correndo.
 */
import * as React from "react";

import { BotaoAcao } from "@/components/botao-acao";
import { TileMetrica } from "@/components/tile-metrica";
import { Button } from "@/components/ui/button";
import { LinhaObrigacao } from "@/components/watchdog/linha-obrigacao";
import { dataCurta, reais } from "@/lib/demo/formata";
import type { Linha } from "@/lib/demo/resolve";
import { cn } from "@/lib/utils";

type Familia = "partes-e-evento" | "financeiro" | "saida" | "operacional";

const FAMILIAS: { nome: Familia; rotulo: string }[] = [
  { nome: "partes-e-evento", rotulo: "Quem assina, onde e quando" },
  { nome: "financeiro", rotulo: "Valores, parcelas e mora" },
  { nome: "saida", rotulo: "Cancelamento e rescisão" },
  { nome: "operacional", rotulo: "Obrigações de prazo e contadores" },
];

const TIPOS: Record<string, string> = {
  servico_evento_presencial: "serviço em evento presencial",
  criacao_estudio: "criação em estúdio",
  filmagem_evento: "filmagem de evento",
  outro: "prestação de serviços",
};

type Leitura = {
  linhas: Linha[];
  fila: { sobre: string; pergunta: string }[];
  cabecalho: {
    tipo: string;
    partes: { papel: string; nome: string }[];
    total: number | null;
    desconto: number | null;
    contadores: { descricao: string; resumo: string }[];
  };
};

type Fim = {
  hoje: string;
  duracaoS: number;
  falhas?: Familia[];
  verificacao: { total: number; conferidas: number };
  leitura: Leitura;
  /** O aviso que a rota manda junto do resultado. */
  disclaimer?: string;
};

type EstadoFamilia = {
  conferidas?: number;
  citacoes?: number;
  segundos: number;
  falhou?: boolean;
};

export function Leitor() {
  const [fase, setFase] = React.useState<"parado" | "lendo" | "pronto" | "erro">("parado");
  const [nomeArquivo, setNomeArquivo] = React.useState<string>("");
  const [motor, setMotor] = React.useState<string>("");
  const [paginas, setPaginas] = React.useState<number>(0);
  const [familias, setFamilias] = React.useState<Partial<Record<Familia, EstadoFamilia>>>({});
  const [fim, setFim] = React.useState<Fim | null>(null);
  const [erro, setErro] = React.useState<string>("");
  const [decorrido, setDecorrido] = React.useState(0);
  const [arrastando, setArrastando] = React.useState(false);

  // Soltar fora do cartao nao pode virar navegacao pro proprio PDF.
  React.useEffect(() => {
    const bloqueia = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", bloqueia);
    window.addEventListener("drop", bloqueia);
    return () => {
      window.removeEventListener("dragover", bloqueia);
      window.removeEventListener("drop", bloqueia);
    };
  }, []);

  React.useEffect(() => {
    if (fase !== "lendo") return;
    const inicio = Date.now();
    const timer = setInterval(
      () => setDecorrido(Math.round((Date.now() - inicio) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [fase]);

  const le = async (arquivo: File) => {
    setFase("lendo");
    setNomeArquivo(arquivo.name);
    setFamilias({});
    setFim(null);
    setErro("");
    setDecorrido(0);
    try {
      const form = new FormData();
      form.append("arquivo", arquivo);
      const resposta = await fetch("/api/extrair", { method: "POST", body: form });
      if (!resposta.ok || !resposta.body) {
        const corpo = await resposta.json().catch(() => null);
        throw new Error(corpo?.erro ?? `falha ${resposta.status}`);
      }
      const leitor = resposta.body.getReader();
      const decodificador = new TextDecoder();
      let resto = "";
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        resto += decodificador.decode(value, { stream: true });
        const linhas = resto.split("\n");
        resto = linhas.pop() ?? "";
        for (const linha of linhas) {
          if (!linha.trim()) continue;
          const evento = JSON.parse(linha);
          if (evento.tipo === "inicio") {
            setPaginas(evento.paginas);
            setMotor(evento.motor);
          } else if (evento.tipo === "familia") {
            setFamilias((f) => ({
              ...f,
              [evento.nome as Familia]: {
                conferidas: evento.conferidas,
                citacoes: evento.citacoes,
                segundos: evento.segundos,
                falhou: evento.falhou,
              },
            }));
          } else if (evento.tipo === "fim") {
            setFim(evento as Fim);
            setFase("pronto");
          } else if (evento.tipo === "erro") {
            throw new Error(evento.erro);
          }
        }
      }
      setFase((f) => (f === "lendo" ? "erro" : f));
      setErro((e) => e || "a leitura terminou sem resultado");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setFase("erro");
    }
  };

  const leExemplo = async (caminho: string, nome: string) => {
    const blob = await (await fetch(caminho)).blob();
    await le(new File([blob], nome, { type: "application/pdf" }));
  };

  if (fase === "parado" || fase === "erro") {
    return (
      <div className="flex flex-col gap-6">
        {fase === "erro" ? (
          <p className="rounded-lg bg-queda/12 px-4 py-3 text-corpo text-queda">
            {erro}
          </p>
        ) : null}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            const f = e.dataTransfer.files?.[0];
            if (!f) return;
            if (f.type !== "application/pdf" && !f.name.endsWith(".pdf")) {
              setErro("Isso não é um PDF. O leitor só aceita contrato em PDF.");
              setFase("erro");
              return;
            }
            void le(f);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-linha-campo bg-papel px-6 py-14 text-center transition-colors hover:border-texto-tenue",
            arrastando && "border-texto-tenue bg-papel-fundo",
          )}
        >
          <span className="text-lede font-medium">
            Solte um contrato em PDF aqui, ou clique para escolher
          </span>
          <span className="text-corpo text-texto-suave">
            O sistema lê, cita a cláusula de cada campo, confere cada citação
            contra a página, e o calendário sai calculado. Nada é salvo.
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void le(f);
            }}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ui text-texto-suave">Ou use um exemplo:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              leExemplo("/contratos/contrato-show-dezembro.pdf", "contrato-show.pdf")
            }
          >
            o contrato do show (9 páginas)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              leExemplo("/contratos/contrato-videos-estudio.pdf", "contrato-videos.pdf")
            }
          >
            o contrato sem data de evento (8 páginas)
          </Button>
        </div>
      </div>
    );
  }

  if (fase === "lendo") {
    return (
      <div className="flex flex-col gap-5 rounded-2xl bg-papel p-6 shadow-papel sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-h3 font-semibold tracking-tight">
            Lendo {nomeArquivo}
          </p>
          <p className="font-mono text-h3 tabular-nums text-texto-suave">
            {Math.floor(decorrido / 60)}:{String(decorrido % 60).padStart(2, "0")}
          </p>
        </div>
        <p className="text-corpo text-texto-suave">
          {paginas ? `${paginas} páginas. ` : ""}São quatro leituras em
          paralelo, e a mais lenta manda no tempo: costuma levar alguns
          minutos. Cada família aparece aqui quando termina.
          {motor === "claude-code"
            ? " Lendo pela conta local do Claude, sem custo de API."
            : ""}
        </p>
        <div className="flex flex-col gap-2">
          {FAMILIAS.map((f) => {
            const feito = familias[f.nome];
            return (
              <div
                key={f.nome}
                className="flex items-center justify-between gap-4 rounded-lg bg-papel-fundo px-4 py-3"
              >
                <span className="text-corpo">{f.rotulo}</span>
                {feito?.falhou ? (
                  <span className="text-rotulo text-queda">
                    falhou, entra no aviso do resultado
                  </span>
                ) : feito ? (
                  <span className="font-mono text-rotulo tabular-nums text-texto-suave">
                    {feito.conferidas}/{feito.citacoes} citações conferidas em{" "}
                    {feito.segundos}s
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 text-rotulo text-texto-tenue">
                    <span className="size-2 animate-pulse rounded-full bg-aviso" />
                    lendo
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const r = fim!;
  const l = r.leitura;
  const contratante = l.cabecalho.partes.find((p) => p.papel === "contratante");
  const contratado = l.cabecalho.partes.find((p) => p.papel === "contratado");

  return (
    <div className="flex flex-col gap-8">
      {r.falhas && r.falhas.length > 0 ? (
        <p className="rounded-lg bg-aviso px-4 py-3 text-corpo text-sobre-aviso">
          Uma parte da leitura não terminou (
          {r.falhas
            .map((n) => FAMILIAS.find((f) => f.nome === n)?.rotulo ?? n)
            .join(", ")}
          ). O que está abaixo é o que chegou: leia de novo para completar.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-4">
        <TileMetrica rotulo="páginas lidas" valor={String(paginas)} />
        <TileMetrica
          rotulo="citações conferidas"
          valor={String(r.verificacao.conferidas)}
          fracao={` de ${r.verificacao.total}`}
          nota="contra o texto da página"
        />
        <TileMetrica
          rotulo="tempo de leitura"
          valor={`${Math.floor(r.duracaoS / 60)}:${String(r.duracaoS % 60).padStart(2, "0")}`}
        />
        <TileMetrica
          rotulo="perguntas abertas"
          valor={String(l.fila.length)}
          nota="o que o sistema não chutou"
        />
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-papel p-5 shadow-papel">
        <p className="text-rotulo uppercase text-texto-tenue">
          o que o documento é
        </p>
        <p className="text-corpo text-texto">
          Contrato de {TIPOS[l.cabecalho.tipo] ?? l.cabecalho.tipo}
          {contratado ? `, prestado por ${contratado.nome}` : ""}
          {contratante ? ` para ${contratante.nome}` : ""}.
          {l.cabecalho.total !== null
            ? ` Valor de ${reais(l.cabecalho.total)}${l.cabecalho.desconto ? `, com desconto de ${reais(l.cabecalho.desconto)}` : ""}.`
            : ""}
        </p>
      </div>

      {l.fila.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg bg-papel p-5 shadow-papel">
          <p className="text-rotulo uppercase text-texto-tenue">
            fila humana: o sistema pergunta em vez de chutar
          </p>
          {l.fila.map((f, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <p className="text-corpo font-medium text-texto">{f.sobre}</p>
              <p className="text-ui text-texto-suave">{f.pergunta}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <p className="text-h3 font-semibold tracking-tight">
          O calendário que saiu do documento
        </p>
        <p className="text-corpo text-texto-suave">
          Hoje para o sistema: {dataCurta(r.hoje)}. Data sem etiqueta de
          escrita foi calculada por código a partir da regra citada.
        </p>
        <div className="rounded-lg bg-papel px-5 shadow-papel">
          {l.linhas.map((linha) => (
            <LinhaObrigacao key={linha.id} linha={linha} />
          ))}
        </div>
      </div>

      {l.cabecalho.contadores.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg bg-papel p-5 shadow-papel">
          <p className="text-rotulo uppercase text-texto-tenue">
            sem data, mas com dinheiro: os contadores
          </p>
          {l.cabecalho.contadores.map((ct, i) => (
            <p key={i} className="text-corpo text-texto">
              {ct.descricao}
              {ct.resumo ? (
                <span className="text-texto-suave"> ({ct.resumo})</span>
              ) : null}
            </p>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-rotulo text-texto-tenue">
            {motor === "claude-code"
              ? "Lido pela conta local do Claude. Em produção, entra a chave de API."
              : "Lido pelo AI Gateway."}{" "}
            Nada foi salvo.
          </p>
          <BotaoAcao onClick={() => setFase("parado")}>
            Ler outro contrato
          </BotaoAcao>
        </div>
        {/* O aviso vem da rota, nao daqui: quem le diz o que a leitura e. */}
        {r.disclaimer ? (
          <p className="border-t border-linha pt-3 text-rotulo text-texto-tenue">
            {r.disclaimer}
          </p>
        ) : null}
      </div>
    </div>
  );
}
