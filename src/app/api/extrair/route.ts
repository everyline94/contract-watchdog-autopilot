/**
 * POST /api/extrair: recebe um PDF e transmite a leitura como NDJSON.
 *
 * A leitura leva minutos (quatro chamadas ao modelo, a mais lenta manda),
 * entao a rota nao fica muda: cada familia que termina vira uma linha no
 * stream, e a tela mostra o progresso enquanto o resto ainda le. O ultimo
 * evento traz a leitura completa ja verificada e calculada pelo motor.
 */
import { agora, hojeISO } from "@/lib/clock";
import {
  contratoVazio,
  extraiFamilia,
  faltaPraLer,
  motorDisponivel,
} from "@/lib/extracao/extrator";
import { paraLinhas } from "@/lib/extracao/para-linhas";
import { extraiPaginas } from "@/lib/extracao/pdf";
import { SCHEMAS_FAMILIA, type NomeFamilia } from "@/lib/extracao/schemas";
import { verificaCitacoes } from "@/lib/extracao/verificador";
import { ContratoExtraido } from "@/lib/types";

export const maxDuration = 300;

/**
 * O aviso que fecha toda leitura. Guardrail adaptado do agente-dra-julia-
 * advocacia (MIT), creditado no README: o sistema le e calcula, e nao decide
 * no lugar de advogado.
 */
const DISCLAIMER =
  "Análise gerada por IA. Não substitui revisão por advogado habilitado.";

const escreve = (controlador: ReadableStreamDefaultController, obj: unknown) =>
  controlador.enqueue(new TextEncoder().encode(JSON.stringify(obj) + "\n"));

/**
 * Fail-closed na nuvem: cada leitura custa quatro chamadas de modelo, e a
 * rota e publica. Com EXTRAIR_TOKEN setado, exige o token; sem ele, na
 * Vercel a rota nem abre. Na maquina local (palco) segue livre.
 */
function autorizadoExtrair(req: Request): { status: number; erro: string } | null {
  const token = process.env.EXTRAIR_TOKEN;
  if (token) {
    if (req.headers.get("authorization") !== `Bearer ${token}`) {
      return {
        status: 401,
        erro: "Leitura protegida. Informe o token no header Authorization.",
      };
    }
    return null;
  }
  if (process.env.VERCEL) {
    return {
      status: 503,
      erro:
        "O leitor público está desligado nesta versão. A demo guiada na home mostra o mesmo motor sobre contratos já lidos.",
    };
  }
  return null;
}

export async function POST(req: Request) {
  const bloqueio = autorizadoExtrair(req);
  if (bloqueio) {
    return Response.json({ erro: bloqueio.erro }, { status: bloqueio.status });
  }

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!(arquivo instanceof File)) {
    return Response.json({ erro: "Envie um PDF no campo 'arquivo'." }, { status: 400 });
  }
  if (arquivo.size > 15 * 1024 * 1024) {
    return Response.json({ erro: "PDF acima de 15MB." }, { status: 400 });
  }
  const tipoDeclarado = (arquivo.type || "").toLowerCase();
  if (tipoDeclarado && !tipoDeclarado.includes("pdf")) {
    return Response.json(
      { erro: "O arquivo não é um PDF. Exporte o contrato como PDF e suba de novo." },
      { status: 415 },
    );
  }

  const dados = new Uint8Array(await arquivo.arrayBuffer());
  // Assinatura %PDF-: o content-type e declarado pelo cliente, o cabecalho nao
  if (new TextDecoder().decode(dados.slice(0, 5)) !== "%PDF-") {
    return Response.json(
      { erro: "O conteúdo não parece ser um PDF válido. Exporte de novo (imprimir para PDF resolve a maioria) e suba outra vez." },
      { status: 415 },
    );
  }
  let paginas: Awaited<ReturnType<typeof extraiPaginas>>;
  try {
    paginas = await extraiPaginas(dados);
  } catch {
    // Cabecalho %PDF- presente mas o resto nao abre: arquivo truncado ou
    // corrompido. Erro do cliente, nao do servidor.
    return Response.json(
      { erro: "Não conseguimos abrir este PDF. O arquivo parece corrompido ou incompleto; exporte de novo e suba outra vez." },
      { status: 422 },
    );
  }
  if (paginas.every((p) => p.texto.trim().length < 40)) {
    return Response.json(
      {
        erro:
          "Este PDF não tem texto extraível (provavelmente é escaneado). Contrato escaneado está fora do MVP por decisão de escopo.",
      },
      { status: 422 },
    );
  }

  // Antes de gastar os minutos de leitura: o motor esta de pe? Falhar aqui,
  // com 503 e a proxima acao escrita, poupa quem clonou o projeto de esperar
  // quatro chamadas morrerem pra receber "tente de novo".
  const falta = faltaPraLer();
  if (falta) {
    return Response.json({ erro: falta }, { status: 503 });
  }

  const inicio = Date.now();
  const stream = new ReadableStream({
    async start(controlador) {
      try {
        escreve(controlador, {
          tipo: "inicio",
          paginas: paginas.length,
          motor: motorDisponivel(),
        });

        const nomes = Object.keys(SCHEMAS_FAMILIA) as NomeFamilia[];
        const parciais: Record<string, unknown>[] = [];
        const falhas: NomeFamilia[] = [];
        let conferidas = 0;
        let citacoes = 0;

        // Concorrencia 2: quatro chamadas simultaneas estouram o limite de
        // tokens por minuto da conta e viram fila com timeout. Duas por vez
        // mantem o fluxo andando sem derrubar a mais lenta.
        const fila = [...nomes];
        const trabalhador = async () => {
          for (;;) {
            const nome = fila.shift();
            if (!nome) return;
            try {
              const r = await extraiFamilia(nome, paginas);
              const itens = verificaCitacoes(r.parcial, paginas);
              conferidas += itens.filter((i) => i.ok).length;
              citacoes += itens.length;
              parciais.push(r.parcial);
              escreve(controlador, {
                tipo: "familia",
                nome,
                conferidas: itens.filter((i) => i.ok).length,
                citacoes: itens.length,
                segundos: Math.round((Date.now() - inicio) / 1000),
              });
            } catch {
              falhas.push(nome);
              escreve(controlador, {
                tipo: "familia",
                nome,
                falhou: true,
                segundos: Math.round((Date.now() - inicio) / 1000),
              });
            }
          }
        };
        await Promise.all([trabalhador(), trabalhador()]);

        if (parciais.length === 0) {
          escreve(controlador, {
            tipo: "erro",
            erro: "Nenhuma das leituras terminou. Tente de novo.",
          });
          return;
        }

        // Cada familia ja validou sozinha; o safeParse depois do merge pega
        // o que so quebra na juncao (invariante cruzada, esqueleto de falha).
        // Reprovar aqui e bug nosso, nao do PDF: loga e segue com o que ha,
        // porque derrubar a leitura inteira no palco seria pior.
        const mesclado = Object.assign(contratoVazio(), ...parciais);
        const validacao = ContratoExtraido.safeParse(mesclado);
        if (!validacao.success) {
          console.error(
            "[extrair] contrato mesclado reprovou no schema:",
            validacao.error.issues.slice(0, 10),
          );
        }
        const contrato = validacao.success
          ? validacao.data
          : (mesclado as ContratoExtraido);
        const hoje = hojeISO(await agora());
        const leitura = paraLinhas(contrato, hoje);

        escreve(controlador, {
          tipo: "fim",
          hoje,
          duracaoS: Math.round((Date.now() - inicio) / 1000),
          falhas,
          verificacao: { total: citacoes, conferidas },
          leitura,
          disclaimer: DISCLAIMER,
        });
      } catch (e) {
        // O cru vai pro log do servidor; a tela recebe mensagem de produto
        // com proxima acao, nunca exit code de subprocess ou erro de provedor.
        console.error("[extrair] leitura falhou:", e);
        const msg = e instanceof Error ? e.message : String(e);
        escreve(controlador, {
          tipo: "erro",
          erro: msg.includes("credit card")
            ? "O leitor na nuvem ainda não tem créditos de modelo. Por enquanto ele roda na máquina local, pela conta do Claude de quem apresenta."
            : "A leitura falhou no meio do caminho. Tente de novo; se repetir, exporte o PDF outra vez (imprimir para PDF resolve a maioria) e suba de novo.",
        });
      } finally {
        controlador.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
