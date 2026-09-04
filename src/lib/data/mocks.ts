/**
 * A semente do produto: 12 contratos de um fornecedor de eventos, cobrindo os
 * cinco status, 3 itens na fila de incerteza com motivos distintos, 2 uploads
 * em andamento e 1 resposta "nao aceite" registrada.
 *
 * Toda data e RELATIVA ao hoje recebido: atrasado e em risco funcionam em
 * qualquer dia de demo, sem semente vencida no mes seguinte.
 *
 * Status e confianca do contrato NAO moram aqui: o store deriva os dois das
 * clausulas e da fila, pela mesma regra que vale em producao.
 */
import { deISO, paraISO, somaDias } from "@/lib/motor-datas";
import type {
  Clausula,
  Conector,
  Contrato,
  EventoTimeline,
  ItemIncerteza,
  ItemFilaUpload,
  RespostaContraparte,
  SincronizacaoAgenda,
  StatusClausula,
  TipoClausula,
} from "./tipos";

export type Semente = {
  contratos: Contrato[];
  clausulas: Clausula[];
  incertezas: ItemIncerteza[];
  filaUpload: ItemFilaUpload[];
  eventos: EventoTimeline[];
  respostas: RespostaContraparte[];
  conectores: Conector[];
  agendas: SincronizacaoAgenda[];
};

/**
 * As duas pastas que os conectores enxergam. Nenhum destes nomes pode bater
 * no PADRAO_ERRO de src/lib/data/upload.ts (ilegivel, corrompido, senha, foto):
 * arquivo com essas palavras morre na leitura de proposito, e importado do
 * conector isso pareceria bug do conector.
 */
function criaConectores(): Conector[] {
  return [
    {
      provedor: "google-drive",
      estado: "desconectado",
      conta: null,
      arquivos: [
        {
          id: "gd-1",
          nome: "contrato-buffet-colonial-2027.pdf",
          tamanho: "1,4 MB",
          pasta: "Meu Drive / Contratos 2027",
        },
        {
          id: "gd-2",
          nome: "locacao-som-e-luz-reveillon.pdf",
          tamanho: "890 KB",
          pasta: "Meu Drive / Contratos 2027",
        },
        {
          id: "gd-3",
          nome: "aditivo-palco-b-arena.pdf",
          tamanho: "612 KB",
          pasta: "Meu Drive / Aditivos",
        },
      ],
    },
    {
      provedor: "onedrive",
      estado: "desconectado",
      conta: null,
      arquivos: [
        {
          id: "od-1",
          nome: "contrato-catering-vila-real-2027.pdf",
          tamanho: "1,1 MB",
          pasta: "Documentos / Eventos",
        },
        {
          id: "od-2",
          nome: "locacao-mobiliario-casamento-junho.pdf",
          tamanho: "740 KB",
          pasta: "Documentos / Eventos",
        },
      ],
    },
  ];
}

export function criaSemente(hoje: string): Semente {
  /** hoje + n dias, em ISO civil. */
  const d = (n: number) => paraISO(somaDias(deISO(hoje), n));
  /** Instante para timeline e upload: data civil + hora fixa de SP. */
  const t = (n: number, hora: string) => `${d(n)}T${hora}:00-03:00`;

  let seqClausula = 0;
  const cl = (
    contratoId: string,
    tipo: TipoClausula,
    resumo: string,
    original: string,
    extra: Partial<
      Pick<
        Clausula,
        | "dataLimite"
        | "valorCentavos"
        | "responsavel"
        | "status"
        | "confianca"
        | "revisadoPor"
      >
    > = {},
  ): Clausula => ({
    id: `${contratoId}-cl${String(++seqClausula).padStart(2, "0")}`,
    contratoId,
    tipo,
    textoOriginal: original,
    resumoSimplificado: resumo,
    dataLimite: extra.dataLimite ?? null,
    valorCentavos: extra.valorCentavos ?? null,
    responsavel: extra.responsavel ?? "contratante",
    status: (extra.status ?? "pendente") as StatusClausula,
    confianca: extra.confianca ?? 0.94,
    revisadoPor: extra.revisadoPor ?? "ia",
  });

  let seqEvento = 0;
  const ev = (
    contratoId: string,
    tipo: EventoTimeline["tipo"],
    quando: string,
    descricao: string,
    autor: EventoTimeline["autor"],
  ): EventoTimeline => ({
    id: `ev-${String(++seqEvento).padStart(3, "0")}`,
    contratoId,
    tipo,
    quando,
    descricao,
    autor,
  });

  const contrato = (
    id: string,
    titulo: string,
    contraparte: Contrato["contraparte"],
    extra: Partial<
      Pick<
        Contrato,
        | "arquivoUrl"
        | "dataUpload"
        | "vigenciaInicio"
        | "vigenciaFim"
        | "valorCentavos"
        | "indiceReajuste"
        | "tokenPublico"
      >
    >,
  ): Contrato => ({
    id,
    titulo,
    contraparte,
    arquivoUrl: extra.arquivoUrl ?? "/contratos/contrato-show-dezembro.pdf",
    // Placeholders: o store recalcula os dois na inicializacao.
    status: "pendente",
    confiancaExtracao: 1,
    dataUpload: extra.dataUpload ?? t(-30, "09:00"),
    vigenciaInicio: extra.vigenciaInicio ?? null,
    vigenciaFim: extra.vigenciaFim ?? null,
    valorCentavos: extra.valorCentavos ?? null,
    indiceReajuste: extra.indiceReajuste ?? null,
    tokenPublico: extra.tokenPublico ?? `tok-${id}`,
  });

  const contratos: Contrato[] = [
    // 3 pendentes -------------------------------------------------------
    contrato(
      "c-villa",
      "Show de dezembro no Villa Country Club",
      {
        nome: "Marcos Andrade",
        email: "marcos.andrade@villacountry.com.br",
        telefone: "(16) 99712-4408",
        canalPreferencial: "whatsapp",
      },
      {
        dataUpload: t(-21, "10:12"),
        vigenciaInicio: d(-21),
        vigenciaFim: d(104),
        valorCentavos: 2380000,
        tokenPublico: "villa-9f2c",
      },
    ),
    contrato(
      "c-helena",
      "Festa de 15 anos da Helena",
      {
        nome: "Patrícia Sartori",
        email: "patricia.sartori@exemplo.com.br",
        telefone: "(16) 98110-3327",
        canalPreferencial: "whatsapp",
      },
      {
        dataUpload: t(-9, "14:40"),
        vigenciaInicio: d(-9),
        vigenciaFim: d(95),
        valorCentavos: 890000,
        tokenPublico: "helena-2d81",
      },
    ),
    contrato(
      "c-sebrae",
      "Palestra e painel, Sebrae regional",
      {
        nome: "Renata Queiroz",
        email: "renata.queiroz@exemplo.com.br",
        telefone: "(16) 3301-8890",
        canalPreferencial: "email",
      },
      {
        dataUpload: t(-6, "11:05"),
        vigenciaInicio: d(-6),
        vigenciaFim: d(62),
        valorCentavos: 420000,
        tokenPublico: "sebrae-7a19",
      },
    ),

    // 2 em risco --------------------------------------------------------
    contrato(
      "c-casamento",
      "Filmagem de casamento, Ana e Pedro",
      {
        nome: "Ana Beatriz Camargo",
        email: "anabia.camargo@exemplo.com.br",
        telefone: "(16) 99230-5561",
        canalPreferencial: "whatsapp",
      },
      {
        arquivoUrl: "/contratos/contrato-filmagem-casamento.pdf",
        dataUpload: t(-48, "16:20"),
        vigenciaInicio: d(-48),
        vigenciaFim: d(12),
        valorCentavos: 1250000,
        tokenPublico: "anaepedro-5c40",
      },
    ),
    contrato(
      "c-vinil",
      "Festival Vinil na Praça, palco 2",
      {
        nome: "Grupo Vinil Produções",
        email: "contratos@vinilproducoes.com.br",
        telefone: "(11) 97655-0214",
        canalPreferencial: "email",
      },
      {
        dataUpload: t(-15, "09:48"),
        vigenciaInicio: d(-15),
        vigenciaFim: d(45),
        valorCentavos: 3600000,
        indiceReajuste: "IPCA",
        tokenPublico: "vinil-8e02",
      },
    ),

    // 2 atrasados -------------------------------------------------------
    contrato(
      "c-formatura",
      "Formatura de Medicina, turma 48",
      {
        nome: "Comissão de Formatura T48",
        email: "comissao.t48@exemplo.com.br",
        telefone: "(16) 99801-7736",
        canalPreferencial: "email",
      },
      {
        dataUpload: t(-60, "10:00"),
        vigenciaInicio: d(-60),
        vigenciaFim: d(30),
        valorCentavos: 5400000,
        tokenPublico: "t48med-1b6e",
      },
    ),
    contrato(
      "c-buffet",
      "Festa de fim de ano, Buffet Sabor & Arte",
      {
        nome: "Cláudio Ferraz",
        email: "claudio@saborearte.com.br",
        telefone: "(16) 3232-4180",
        canalPreferencial: "email",
      },
      {
        dataUpload: t(-40, "15:30"),
        vigenciaInicio: d(-40),
        vigenciaFim: d(110),
        valorCentavos: 1780000,
        indiceReajuste: "IGPM",
        tokenPublico: "saborearte-3f77",
      },
    ),

    // 2 em incerteza ----------------------------------------------------
    contrato(
      "c-alecrim",
      "Pacote de vídeos, Estúdio Alecrim",
      {
        nome: "Estúdio Alecrim Ltda.",
        email: "financeiro@estudioalecrim.com.br",
        telefone: "(16) 99444-2019",
        canalPreferencial: "email",
      },
      {
        arquivoUrl: "/contratos/contrato-videos-estudio.pdf",
        dataUpload: t(-3, "17:55"),
        vigenciaInicio: d(-3),
        vigenciaFim: null,
        valorCentavos: 960000,
        tokenPublico: "alecrim-4b7d",
      },
    ),
    contrato(
      "c-jardim",
      "Locação e som, Espaço Jardim das Pedras",
      {
        nome: "Espaço Jardim das Pedras",
        email: "eventos@jardimdaspedras.com.br",
        telefone: "(16) 3606-2277",
        canalPreferencial: "whatsapp",
      },
      {
        dataUpload: t(-1, "08:22"),
        vigenciaInicio: null,
        vigenciaFim: null,
        valorCentavos: null,
        tokenPublico: "jardim-6a93",
      },
    ),

    // 3 fechados --------------------------------------------------------
    contrato(
      "c-techbras",
      "Convenção anual TechBras",
      {
        nome: "TechBras Sistemas S.A.",
        email: "eventos@techbras.com.br",
        telefone: "(11) 4004-7130",
        canalPreferencial: "email",
      },
      {
        dataUpload: t(-90, "09:15"),
        vigenciaInicio: d(-90),
        vigenciaFim: d(-10),
        valorCentavos: 4150000,
        tokenPublico: "techbras-0c58",
      },
    ),
    contrato(
      "c-nathalia",
      "Casamento Nathália e Rafael",
      {
        nome: "Nathália Furlan",
        email: "nathalia.furlan@exemplo.com.br",
        telefone: "(16) 98877-6205",
        canalPreferencial: "whatsapp",
      },
      {
        dataUpload: t(-75, "13:10"),
        vigenciaInicio: d(-75),
        vigenciaFim: d(-20),
        valorCentavos: 1420000,
        tokenPublico: "nathalia-9d34",
      },
    ),
    contrato(
      "c-reveillon",
      "DJ e sonorização, Réveillon do clube",
      {
        nome: "Clube Recreativo Paineiras",
        email: "secretaria@clubepaineiras.org.br",
        telefone: "(16) 3336-9001",
        canalPreferencial: "email",
      },
      {
        dataUpload: t(-25, "10:45"),
        vigenciaInicio: d(-25),
        vigenciaFim: d(126),
        valorCentavos: 2200000,
        tokenPublico: "paineiras-4e12",
      },
    ),
  ];

  const clausulas: Clausula[] = [
    // c-villa: pendente. Entrada paga, resto corre no prazo, sem multa aberta.
    cl("c-villa", "valor", "Entrada de 30% na assinatura",
      "Cláusula 4.1. A título de sinal e princípio de pagamento, a CONTRATANTE pagará 30% (trinta por cento) do valor total na data de assinatura deste instrumento.",
      { dataLimite: d(-19), valorCentavos: 714000, status: "cumprida", confianca: 0.98 }),
    cl("c-villa", "valor", "Parcela intermediária de 40%",
      "Cláusula 4.2. O montante correspondente a 40% (quarenta por cento) do valor total será adimplido em até 45 (quarenta e cinco) dias antes da data do evento.",
      { dataLimite: d(59), valorCentavos: 952000, confianca: 0.96 }),
    cl("c-villa", "valor", "Saldo de 30% até 7 dias antes do show",
      "Cláusula 4.3. O saldo remanescente deverá estar integralmente quitado até 7 (sete) dias corridos antes da realização do evento.",
      { dataLimite: d(97), valorCentavos: 714000, confianca: 0.93 }),
    cl("c-villa", "obrigacao", "Enviar rider técnico e mapa de palco",
      "Cláusula 7.2. A CONTRATANTE compromete-se a encaminhar o rider técnico e o mapa de palco com antecedência mínima de 30 (trinta) dias da data do evento.",
      { dataLimite: d(74), confianca: 0.89 }),
    cl("c-villa", "prazo", "Data do show confirmada",
      "Cláusula 2.1. O evento realizar-se-á na data aprazada, com início às 22h e duração de 4 (quatro) horas de apresentação.",
      { dataLimite: d(104), responsavel: "contratado", confianca: 0.97 }),

    // c-helena: pendente, prazos distantes.
    cl("c-helena", "valor", "Entrada de 50% na assinatura",
      "Cláusula 3.1. Pagamento de 50% (cinquenta por cento) do valor ajustado no ato da contratação, via transferência bancária.",
      { dataLimite: d(-8), valorCentavos: 445000, status: "cumprida", confianca: 0.97 }),
    cl("c-helena", "valor", "Saldo até 15 dias antes da festa",
      "Cláusula 3.2. O saldo restante deverá ser quitado em até 15 (quinze) dias que antecedem a realização do evento.",
      { dataLimite: d(80), valorCentavos: 445000, confianca: 0.95 }),
    cl("c-helena", "obrigacao", "Aprovar lista de músicas da valsa",
      "Cláusula 6.4. A CONTRATANTE deverá aprovar o repertório da valsa e das homenagens com no mínimo 20 (vinte) dias de antecedência.",
      { dataLimite: d(75), confianca: 0.88 }),

    // c-sebrae: pendente.
    cl("c-sebrae", "valor", "Pagamento único contra nota fiscal",
      "Cláusula 5.1. O pagamento será realizado em parcela única, mediante apresentação de nota fiscal, em até 30 (trinta) dias após a prestação dos serviços.",
      { dataLimite: d(92), valorCentavos: 420000, responsavel: "contratante", confianca: 0.96 }),
    cl("c-sebrae", "obrigacao", "Entregar apresentação para revisão prévia",
      "Cláusula 8.3. O CONTRATADO enviará o material de apoio da palestra para validação institucional com 10 (dez) dias úteis de antecedência.",
      { dataLimite: d(48), responsavel: "contratado", confianca: 0.91 }),

    // c-casamento: em risco pela via do prazo curto: saldo vence em 5 dias,
    // e ha multa de cancelamento em aberto.
    cl("c-casamento", "valor", "Entrada de 40% na reserva da data",
      "Cláusula 4.1. Para reserva da data, a CONTRATANTE pagará 40% (quarenta por cento) do valor total, não reembolsável em caso de desistência.",
      { dataLimite: d(-46), valorCentavos: 500000, status: "cumprida", confianca: 0.97 }),
    cl("c-casamento", "valor", "Saldo até 7 dias antes do casamento",
      "Cláusula 4.3. O saldo deverá estar quitado impreterivelmente até 7 (sete) dias antes da cerimônia, sob pena de suspensão da cobertura.",
      { dataLimite: d(5), valorCentavos: 750000, confianca: 0.94 }),
    cl("c-casamento", "multa", "Multa de 20% por cancelamento em cima da hora",
      "Cláusula 9.2. O cancelamento com menos de 30 (trinta) dias da data ensejará multa compensatória de 20% (vinte por cento) sobre o valor total do contrato.",
      { valorCentavos: 250000, confianca: 0.92 }),
    cl("c-casamento", "obrigacao", "Entregar prévia do filme em 60 dias",
      "Cláusula 6.1. O CONTRATADO entregará a prévia editada do filme em até 60 (sessenta) dias corridos contados da data do evento.",
      { dataLimite: d(72), responsavel: "contratado", confianca: 0.9 }),

    // c-vinil: em risco pela via da multa: nada vence em 7 dias, mas ha multa
    // em aberto e obrigacao com data.
    cl("c-vinil", "valor", "Cachê em duas parcelas iguais",
      "Cláusula 5.2. O cachê será pago em 2 (duas) parcelas iguais: a primeira 30 (trinta) dias antes do festival e a segunda em até 10 (dez) dias úteis após a apresentação.",
      { dataLimite: d(15), valorCentavos: 1800000, confianca: 0.93 }),
    cl("c-vinil", "multa", "Multa de 30% por rescisão unilateral",
      "Cláusula 11.1. A rescisão unilateral imotivada por qualquer das partes implicará multa de 30% (trinta por cento) do valor total do instrumento.",
      { valorCentavos: 1080000, confianca: 0.9 }),
    cl("c-vinil", "reajuste", "Reajuste pelo IPCA em caso de adiamento",
      "Cláusula 12.3. Na hipótese de adiamento superior a 90 (noventa) dias, os valores serão corrigidos pelo IPCA acumulado no período.",
      { confianca: 0.87 }),
    cl("c-vinil", "obrigacao", "Enviar mapa de som e luz do palco 2",
      "Cláusula 7.1. A produção encaminhará o mapa técnico do palco 2 com 20 (vinte) dias de antecedência da abertura dos portões.",
      { dataLimite: d(25), responsavel: "contratante", confianca: 0.91 }),

    // c-formatura: atrasado. Parcela venceu ha 12 dias e ninguem cumpriu.
    cl("c-formatura", "valor", "Entrada de 20% na assinatura",
      "Cláusula 4.1. Sinal de 20% (vinte por cento) do valor global, pago no ato da assinatura.",
      { dataLimite: d(-58), valorCentavos: 1080000, status: "cumprida", confianca: 0.97 }),
    cl("c-formatura", "valor", "Segunda parcela de 40%",
      "Cláusula 4.2. A segunda parcela, de 40% (quarenta por cento), vencerá 30 (trinta) dias antes da colação de grau.",
      { dataLimite: d(-12), valorCentavos: 2160000, confianca: 0.95 }),
    cl("c-formatura", "valor", "Saldo final no dia do evento",
      "Cláusula 4.3. O saldo remanescente será quitado até a data da realização do baile de formatura.",
      { dataLimite: d(30), valorCentavos: 2160000, confianca: 0.94 }),
    cl("c-formatura", "obrigacao", "Confirmar número final de convidados",
      "Cláusula 6.2. A COMISSÃO informará o número definitivo de convidados com 15 (quinze) dias de antecedência.",
      { dataLimite: d(15), confianca: 0.9 }),

    // c-buffet: atrasado, e com reajuste RECUSADO pela contraparte (o caso
    // nao_aceite da semente).
    cl("c-buffet", "valor", "Primeira parcela de 50%",
      "Cláusula 3.1. Pagamento de 50% (cinquenta por cento) do valor contratado em até 30 (trinta) dias da assinatura.",
      { dataLimite: d(-10), valorCentavos: 890000, confianca: 0.95 }),
    cl("c-buffet", "reajuste", "Reajuste de 6,2% pelo IGP-M no aditivo",
      "Cláusula 10.2. Os valores do presente instrumento serão reajustados pelo IGP-M acumulado dos últimos 12 (doze) meses, aplicável a partir do aditivo de prorrogação.",
      { valorCentavos: 110360, status: "recusada", confianca: 0.89 }),
    cl("c-buffet", "valor", "Saldo até 10 dias antes da festa",
      "Cláusula 3.2. O saldo deverá ser quitado em até 10 (dez) dias corridos antes da data do evento.",
      { dataLimite: d(100), valorCentavos: 890000, confianca: 0.94 }),

    // c-alecrim: incerteza. Duas clausulas problematicas que geram os itens
    // de motivo clausula_ambigua e dado_faltante.
    cl("c-alecrim", "valor", "Entrada de 50% na assinatura",
      "Cláusula 3.1. Entrada de 50% (cinquenta por cento) no ato da assinatura, via PIX.",
      { dataLimite: d(-2), valorCentavos: 480000, status: "cumprida", confianca: 0.96 }),
    cl("c-alecrim", "reajuste", "Reajuste anual por índice não especificado",
      "Cláusula 8.1. Os valores serão reajustados anualmente pelo índice oficial que melhor refletir a variação de custos do setor audiovisual, ou outro que venha a substituí-lo.",
      { confianca: 0.58 }),
    cl("c-alecrim", "prazo", "Saldo vinculado à data de entrega dos vídeos",
      "Cláusula 3.2. O saldo será pago na entrega final dos materiais, em data a ser definida de comum acordo entre as partes.",
      { valorCentavos: 480000, confianca: 0.52 }),
    cl("c-alecrim", "obrigacao", "Entregar roteiro aprovado antes da gravação",
      "Cláusula 5.2. A CONTRATANTE aprovará o roteiro com antecedência mínima de 5 (cinco) dias úteis da primeira diária de gravação.",
      { dataLimite: d(18), confianca: 0.9 }),

    // c-jardim: incerteza por PDF ilegivel. A extracao veio quase vazia.
    cl("c-jardim", "obrigacao", "Vistoria conjunta do espaço",
      "Cláusula 6.3. As partes realizarão vistoria conjunta do espaço em data anterior ao evento.",
      { confianca: 0.78 }),

    // c-techbras: fechado. Tudo cumprido.
    cl("c-techbras", "valor", "Entrada de 30%",
      "Cláusula 4.1. Sinal de 30% (trinta por cento) na assinatura do instrumento.",
      { dataLimite: d(-85), valorCentavos: 1245000, status: "cumprida", confianca: 0.97 }),
    cl("c-techbras", "valor", "Saldo em até 10 dias úteis após o evento",
      "Cláusula 4.2. O saldo será pago em até 10 (dez) dias úteis contados do encerramento da convenção, mediante nota fiscal.",
      { dataLimite: d(-14), valorCentavos: 2905000, status: "cumprida", confianca: 0.96 }),
    cl("c-techbras", "obrigacao", "Entregar relatório de cobertura do evento",
      "Cláusula 7.4. O CONTRATADO entregará o relatório final de cobertura em até 15 (quinze) dias após o evento.",
      { dataLimite: d(-9), responsavel: "contratado", status: "cumprida", confianca: 0.92 }),

    // c-nathalia: fechado.
    cl("c-nathalia", "valor", "Entrada na reserva da data",
      "Cláusula 3.1. Reserva mediante pagamento de 40% (quarenta por cento) do valor total.",
      { dataLimite: d(-73), valorCentavos: 568000, status: "cumprida", confianca: 0.98 }),
    cl("c-nathalia", "valor", "Saldo uma semana antes do casamento",
      "Cláusula 3.2. Quitação integral do saldo até 7 (sete) dias antes da cerimônia.",
      { dataLimite: d(-27), valorCentavos: 852000, status: "cumprida", confianca: 0.96 }),
    cl("c-nathalia", "obrigacao", "Entrega do álbum e do filme",
      "Cláusula 6.5. Entrega do álbum diagramado e do filme editado em até 45 (quarenta e cinco) dias da data do evento.",
      { dataLimite: d(-20), responsavel: "contratado", status: "cumprida", confianca: 0.93 }),

    // c-reveillon: fechado pela via do aceite: contraparte aceitou os termos
    // notificados, nada mais em aberto ate a proxima janela.
    cl("c-reveillon", "valor", "Entrada de 40% na assinatura",
      "Cláusula 4.1. Sinal de 40% (quarenta por cento) do cachê na assinatura.",
      { dataLimite: d(-23), valorCentavos: 880000, status: "cumprida", confianca: 0.97 }),
    cl("c-reveillon", "valor", "Saldo até 15 de dezembro",
      "Cláusula 4.2. O saldo será quitado até o dia 15 (quinze) de dezembro do corrente ano.",
      { dataLimite: d(108), valorCentavos: 1320000, status: "aceita", confianca: 0.95 }),
    cl("c-reveillon", "renovacao", "Renovação automática para o próximo réveillon",
      "Cláusula 13.1. O contrato renova-se automaticamente para o exercício seguinte, salvo manifestação em contrário com 60 (sessenta) dias de antecedência.",
      { dataLimite: d(66), status: "aceita", confianca: 0.88 }),
  ];

  // A ordem importa: motivos distintos, um por item, como pede a semente.
  const incertezas: ItemIncerteza[] = [
    {
      id: "inc-01",
      contratoId: "c-alecrim",
      clausulaId: clausulas.find((c) => c.contratoId === "c-alecrim" && c.tipo === "reajuste")!.id,
      motivo: "clausula_ambigua",
      trechoBruto:
        "os valores serão reajustados anualmente pelo índice oficial que melhor refletir a variação de custos do setor audiovisual, ou outro que venha a substituí-lo",
      paginaPreviewUrl: null,
      interpretacaoSugerida:
        "A cláusula não nomeia o índice. Pelo padrão do setor, a IA sugere IPCA, mas IGP-M também caberia na redação.",
      confianca: 0.58,
      assumidoPor: null,
    },
    {
      id: "inc-02",
      contratoId: "c-alecrim",
      clausulaId: clausulas.find((c) => c.contratoId === "c-alecrim" && c.tipo === "prazo")!.id,
      motivo: "dado_faltante",
      trechoBruto:
        "o saldo será pago na entrega final dos materiais, em data a ser definida de comum acordo entre as partes",
      paginaPreviewUrl: null,
      interpretacaoSugerida:
        "Não existe data de entrega no documento. Sem ela, o vencimento do saldo de R$ 4.800,00 não pode ser calculado.",
      confianca: 0.52,
      assumidoPor: null,
    },
    {
      id: "inc-03",
      contratoId: "c-jardim",
      clausulaId: null,
      motivo: "pdf_ilegivel",
      trechoBruto:
        "Cl usula 4 . O pagamen o de R$ [ilegível] ser  efetuado at  o d a [ilegível] sob pena de",
      paginaPreviewUrl: "/evidencias/b-pergunta.png",
      interpretacaoSugerida:
        "O PDF veio de foto com baixa resolução e a página 2 inteira não passou na leitura. Valores e prazos de pagamento não são confiáveis; o ideal é pedir o arquivo original.",
      confianca: 0.31,
      assumidoPor: null,
    },
  ];

  // 2 uploads em andamento, em etapas distintas. Sem relogio na semente:
  // ganham um no primeiro poll (avancaFila) e seguem sozinhos dali; o up-02
  // ja esta na revisao, que so conclui com gente.
  const filaUpload: ItemFilaUpload[] = [
    {
      id: "up-01",
      nomeArquivo: "contrato-pedra-alta-festival.pdf",
      etapa: "extracao",
      progresso: 62,
      erro: null,
      contratoId: null,
    },
    {
      id: "up-02",
      nomeArquivo: "aditivo-vinil-na-praca.pdf",
      etapa: "revisao",
      progresso: 100,
      erro: null,
      contratoId: null,
    },
  ];

  const respostas: RespostaContraparte[] = [
    {
      id: "resp-01",
      contratoId: "c-buffet",
      clausulaId: clausulas.find((c) => c.contratoId === "c-buffet" && c.tipo === "reajuste")!.id,
      acao: "nao_aceite",
      justificativa:
        "Não concordo com o reajuste de 6,2%. O aditivo foi assinado antes da divulgação do índice e o combinado por telefone foi manter o valor original.",
      quando: t(-4, "19:32"),
    },
  ];

  const eventos: EventoTimeline[] = [
    ...contratos.flatMap((c) => [
      ev(c.id, "upload", c.dataUpload, `Arquivo recebido: ${c.titulo}`, "sistema"),
      ev(
        c.id,
        "extracao",
        c.dataUpload.replace(/T\d\d:\d\d/, (h) => `T${String(Number(h.slice(1, 3))).padStart(2, "0")}:59`),
        "Leitura concluída: cláusulas e obrigações extraídas com citação de origem",
        "ia",
      ),
    ]),
    ev("c-buffet", "notificacao_enviada", t(-5, "06:02"),
      "Notificação por email: reajuste de 6,2% e parcela com vencimento próximo", "sistema"),
    ev("c-buffet", "resposta_contraparte", t(-4, "19:32"),
      "Cláudio Ferraz recusou o reajuste pelo IGP-M e pediu revisão do valor", "contraparte"),
    ev("c-reveillon", "notificacao_enviada", t(-8, "06:01"),
      "Notificação por email: saldo de dezembro e renovação automática", "sistema"),
    ev("c-reveillon", "resposta_contraparte", t(-7, "10:14"),
      "Clube Paineiras aceitou o saldo de dezembro e a renovação automática", "contraparte"),
    ev("c-jardim", "extracao", t(-1, "08:31"),
      "Leitura interrompida: página 2 ilegível, item aberto na fila de incerteza", "ia"),
  ];

  return {
    contratos,
    clausulas,
    incertezas,
    filaUpload,
    eventos,
    respostas,
    conectores: criaConectores(),
    agendas: [],
  };
}
