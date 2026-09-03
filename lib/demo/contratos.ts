/**
 * Os dois contratos da demo, transcritos do GABARITO.json.
 *
 * A ingestao por modelo ainda nao existe, entao as regras vem escritas a mao
 * a partir das clausulas reais, com a mesma evidencia (clausula, item, pagina
 * e citacao literal) que o extrator vai produzir. Quem transforma regra em
 * data continua sendo o motor, a cada request. Quando o extrator entrar, so a
 * origem destes objetos muda.
 */
import type { PrazoRelativo } from "@/lib/types";

export type EvidenciaDemo = {
  /** Como aparece na tela: "Clausula Terceira, item ii., pagina 3". */
  rotulo: string;
  pagina: number;
  citacao: string;
  /** Basename em /public/evidencias, quando a pagina destacada existe. */
  imagem?: string;
};

export type ObrigacaoDemo = {
  id: string;
  titulo: string;
  /** Nota curta abaixo do titulo: devedor terceiro, circularidade, etc. */
  detalhe?: string;
  /** Em reais. So o que e cobravel vira e-mail de cobranca. */
  valor?: number;
  cobravel?: boolean;
  /** Data absoluta escrita no documento (ISO). */
  escritaNoPapel?: string;
  /** A regra relativa, quando existe. O motor resolve. */
  regra?: PrazoRelativo;
  /** A regra dita para gente: "60 dias antes do evento". */
  regraTexto?: string;
  condicao?: string;
  /** Acao recomendada no card, autorada a mao: a direcao (pagar vs cobrar)
   *  depende do papel do usuario no contrato, e texto autorado nao erra isso. */
  acao?: string;
  /** Linha sem como calcular: o texto explica o porque. */
  semData?: string;
  /** true quando a pendencia e uma pergunta que um humano responde. */
  pendenciaHumana?: boolean;
  /** true na linha que E a propria data do evento. */
  ehEvento?: boolean;
  evidencia: EvidenciaDemo;
};

export type ContratoDemo = {
  id: string;
  nome: string;
  contraparte: string;
  papelUsuario: "fornecedor" | "cliente";
  pdf: string;
  paginas: number;
  evento: string | null;
  horario?: string;
  ancorasNomeadas: Record<string, string>;
  valores: { total: number; desconto?: number; liquido: number };
  mora: {
    multaPercentual: number;
    jurosMensalPercentual: number;
    proRataDie: boolean;
    evidencia: EvidenciaDemo;
  };
  obrigacoes: ObrigacaoDemo[];
};

const prazo = (p: Partial<PrazoRelativo>): PrazoRelativo => ({
  ancora: "evento",
  ancora_ref: null,
  sentido: "antes",
  quantidade: 1,
  quantidade_ate: null,
  unidade: "dias",
  base: "corridos",
  condicao: null,
  condicao_morta: false,
  ...p,
});

/** Contrato do show de dezembro: o caso completo, com data de evento. */
export const CONTRATO_SHOW: ContratoDemo = {
  id: "show",
  nome: "Show com VJ e projeções",
  contraparte: "Marina Ferreira Albuquerque",
  papelUsuario: "fornecedor",
  pdf: "/contratos/contrato-show-dezembro.pdf",
  paginas: 9,
  evento: "2026-12-12",
  horario: "das 19:00 às 05:00 do dia seguinte",
  ancorasNomeadas: { entrada: "2026-08-14" },
  valores: { total: 8900, desconto: 600, liquido: 8300 },
  mora: {
    multaPercentual: 2,
    jurosMensalPercentual: 1,
    proRataDie: true,
    evidencia: {
      rotulo: "Cláusula Terceira, 3.3, página 3",
      pagina: 3,
      citacao:
        "Valores em atraso serão acrescidos de: i. multa moratória de 2% (dois por cento) sobre o valor devido; ii. juros de mora de 1% (um por cento) ao mês, pro rata die; iii. correção monetária pelo IPCA",
    },
  },
  obrigacoes: [
    {
      id: "show-evento",
      titulo: "O evento",
      escritaNoPapel: "2026-12-12",
      evidencia: {
        rotulo: "Cláusula Primeira, item 1.4.2.2, página 2",
        pagina: 2,
        citacao:
          "A prestação de serviços ocorrerá no dia 12 de dezembro de 2026 com horário de início às 19:00 hs e com término às 05:00 hs do dia 13 de dezembro de 2026.",
        imagem: "a-evento",
      },
    },
    {
      id: "show-entrada",
      titulo: "Entrada de 30%",
      valor: 2490,
      cobravel: true,
      acao: "Cobrar a entrada de R$ 2.490 da contratante",
      escritaNoPapel: "2026-08-14",
      evidencia: {
        rotulo: "Cláusula Terceira, item i., página 3",
        pagina: 3,
        citacao:
          "R$ 2.490,00 (dois mil, quatrocentos e noventa reais) de entrada, até 14 de agosto de 2026 (já concedido o valor de desconto considerado na cláusula 2.1).",
        imagem: "a-entrada",
      },
    },
    {
      id: "show-saldo",
      titulo: "Saldo de 70%",
      valor: 5810,
      cobravel: true,
      acao: "Cobrar o saldo de R$ 5.810 da contratante",
      escritaNoPapel: "2026-12-08",
      regra: prazo({ quantidade: 7 }),
      regraTexto: "7 dias antes do evento, pela regra da cláusula 3.1",
      evidencia: {
        rotulo: "Cláusula Terceira, item ii., página 3",
        pagina: 3,
        citacao:
          "O pagamento será efetuado em 2 parcelas, sendo pago 30% no momento da contratação e o restante até 07 dias antes do evento, ficando da seguinte forma: i. R$ 2.490,00 (dois mil, quatrocentos e noventa reais) de entrada, até 14 de agosto de 2026 (já concedido o valor de desconto considerado na cláusula 2.1). ii. O restante de R$ 5.810,00 (cinco mil, oitocentos e dez reais) a serem pagos até 08 de dezembro de 2026",
        imagem: "a-saldo",
      },
    },
    {
      id: "show-materiais",
      titulo: "Cliente envia fotos, vídeos, textos e tema",
      acao: "Cobrar da contratante as fotos, os vídeos, os textos e o tema",
      regra: prazo({ quantidade: 30 }),
      regraTexto: "30 dias antes do evento",
      evidencia: {
        rotulo: "Cláusula Primeira, item viii., página 1",
        pagina: 1,
        citacao:
          "Para criação dos materiais visuais (vídeos, monograma, etc.), o(a) CONTRATANTE compromete se a enviar, com antecedência mínima de 30 (trinta) dias da data do evento: i. fotos e vídeos próprios; ii. textos, nomes, datas e demais informações a serem inseridas nas artes",
        imagem: "a-materiais",
      },
    },
    {
      id: "show-pixelmap",
      titulo: "Fornecedor técnico de LED envia o pixelmap",
      detalhe:
        "Devido por um terceiro que não assinou o contrato: o alerta vai para a contratante cobrar",
      acao: "Cobrar da contratante o pixelmap do fornecedor técnico de LED",
      regra: prazo({ quantidade: 30 }),
      regraTexto: "30 dias antes do evento",
      evidencia: {
        rotulo: "Cláusula Quinta, item k., página 5",
        pagina: 5,
        citacao:
          "Garantir que o fornecedor técnico envie o mapeamento da projeção (pixelmap) ao CONTRATADO no prazo máximo de 30 (trinta) dias antes do evento, bem como garantir, no dia, que o mapeamento esteja adequado ao previamente combinado junto ao fornecedor.",
        imagem: "a-pixelmap",
      },
    },
    {
      id: "show-contato",
      titulo: "Contato da equipe técnica chega ao estúdio",
      acao: "Pedir à contratante o contato da equipe técnica",
      regra: prazo({ quantidade: 30 }),
      regraTexto: "30 dias antes do evento",
      evidencia: {
        rotulo: "Cláusula Quinta, item 3., página 6",
        pagina: 6,
        citacao:
          "O contato da equipe técnica deverá ser encaminhado ao CONTRATADO com antecedência mínima de 30 (trinta) dias do evento.",
      },
    },
    {
      id: "show-cancel-30",
      titulo: "Cancelando até aqui, a cliente deve 30%",
      valor: 2490,
      regra: prazo({ quantidade: 60 }),
      regraTexto: "60 dias antes do evento",
      evidencia: {
        rotulo: "Cláusula Sexta, item i., página 6",
        pagina: 6,
        citacao:
          "Se o cancelamento ocorrer com antecedência superior a 60 (sessenta) dias da data do evento: i. será devido ao CONTRATADO o valor correspondente a 30% (trinta por cento) do valor total do contrato",
      },
    },
    {
      id: "show-cancel-50",
      titulo: "Última chance de cancelar devendo 50%",
      valor: 4150,
      regra: prazo({ quantidade: 30 }),
      regraTexto: "30 dias antes do evento",
      evidencia: {
        rotulo: "Cláusula Sexta, item ii., página 6",
        pagina: 6,
        citacao:
          "Se o cancelamento ocorrer entre 59 (cinquenta e nove) e 30 (trinta) dias antes da data do evento: i. será devido ao CONTRATADO o valor correspondente a 50% (cinquenta por cento) do valor total do contrato",
      },
    },
    {
      id: "show-cancel-100",
      titulo: "Daqui em diante, cancelamento deve o valor cheio",
      valor: 8300,
      regra: prazo({ quantidade: 30 }),
      regraTexto: "a partir de 30 dias antes do evento",
      evidencia: {
        rotulo: "Cláusula Sexta, item iii., página 6",
        pagina: 6,
        citacao:
          "Se o cancelamento ocorrer com antecedência inferior a 30 (trinta) dias da data do evento: i. será devido ao CONTRATADO o valor total do contrato",
      },
    },
    {
      id: "show-local",
      titulo: "Prazo para avisar mudança de local",
      condicao: "se houver mudança de local",
      regra: prazo({ quantidade: 48, unidade: "horas" }),
      regraTexto: "48 horas antes do evento",
      evidencia: {
        rotulo: "Cláusula Primeira, item 1.4.2.1, página 2",
        pagina: 2,
        citacao:
          "Qualquer mudança no local deverá ser informada imediatamente ao CONTRATADO através no número (51) 99812-3477, com ligação ou mensagem de WhatsApp, com no mínimo 48 horas de antecedência.",
      },
    },
    {
      id: "show-rescisao",
      titulo: "Atraso da entrada passa de 10 dias: dá direito a rescindir",
      regra: prazo({
        ancora: "parcela",
        ancora_ref: "entrada",
        sentido: "depois",
        quantidade: 10,
      }),
      regraTexto: "10 dias depois do vencimento da entrada",
      evidencia: {
        rotulo: "Cláusula Sexta, item i., página 7",
        pagina: 7,
        citacao:
          "O atraso superior a 10 (dez) dias ou a existência de parcelas em aberto até 48 (quarenta e oito) horas antes do evento autorizará o CONTRATADO a considerar o contrato rescindido por culpa do CONTRATANTE",
      },
    },
    {
      id: "show-decisao",
      titulo: "A decisão: ir ou não ir ao evento",
      detalhe: "A data de maior valor do contrato, e não está escrita nele",
      condicao: "se houver parcela em aberto",
      acao: "Decidir se comparece ao evento ou aciona a cláusula de não comparecimento",
      regra: prazo({ quantidade: 48, unidade: "horas" }),
      regraTexto: "48 horas antes do evento",
      evidencia: {
        rotulo: "Cláusula Terceira, 3.2, item ii., página 3",
        pagina: 3,
        citacao:
          "Deixar de comparecer ao evento, sem devolução de valores já pagos, caso o atraso persista até 48 (quarenta e oito) horas antes da data do evento.",
      },
    },
    {
      id: "show-uso",
      titulo: "Pedido de material para outro uso",
      condicao: "se houver solicitação",
      semData: "Depende da data do uso, que só existe quando houver pedido",
      evidencia: {
        rotulo: "Cláusula Quarta, item vi., página 4",
        pagina: 4,
        citacao:
          "Poder disponibilizar ao(à) CONTRATANTE, a seu critério, press-release e fotos para divulgação, desde que solicitados com antecedência mínima de 10 (dez) dias da data em que serão utilizados.",
      },
    },
  ],
};

/** Contrato dos videos de estudio: uma data escrita em oito paginas. */
export const CONTRATO_ESTUDIO: ContratoDemo = {
  id: "estudio",
  nome: "Criação de vídeos para evento",
  contraparte: "Alecrim Cerimonial e Eventos LTDA",
  papelUsuario: "fornecedor",
  pdf: "/contratos/contrato-videos-estudio.pdf",
  paginas: 8,
  evento: null,
  ancorasNomeadas: { entrada: "2026-09-05" },
  valores: { total: 3290, liquido: 3290 },
  mora: {
    multaPercentual: 2,
    jurosMensalPercentual: 1,
    proRataDie: true,
    evidencia: {
      rotulo: "Cláusula Quarta, item a., página 4",
      pagina: 4,
      citacao:
        "Multa moratória de 2% (dois por cento) sobre o valor em aberto; b. juros de mora de 1% (um por cento) ao mês, pro rata die",
    },
  },
  obrigacoes: [
    {
      id: "estudio-evento",
      titulo: "O evento",
      ehEvento: true,
      semData: "A data do evento não consta no documento",
      evidencia: {
        rotulo: "Cláusula Primeira, item 7., página 2",
        pagina: 2,
        citacao:
          "A CONTRATANTE compromete-se a informar ao CONTRATADO, com antecedência mínima de 30 (trinta) dias da data do evento: a. Data, local e tipo de evento",
        imagem: "b-pergunta",
      },
    },
    {
      id: "estudio-entrada",
      titulo: "Entrada de 30%",
      valor: 987,
      cobravel: true,
      escritaNoPapel: "2026-09-05",
      evidencia: {
        rotulo: "Cláusula Quarta, item a., página 3",
        pagina: 3,
        citacao:
          "30% (trinta por cento) do valor total, a título de sinal e princípio de pagamento, no momento da contratação, sendo o valor de R$ 987,00 (novecentos e oitenta e sete reais), até 05/09/2026",
        imagem: "b-entrada",
      },
    },
    {
      id: "estudio-saldo",
      titulo: "Saldo de 70%",
      valor: 2303,
      cobravel: true,
      regra: prazo({ quantidade: 7 }),
      regraTexto: "7 dias antes do evento",
      evidencia: {
        rotulo: "Cláusula Quarta, item b., página 3",
        pagina: 3,
        citacao:
          "O saldo remanescente, correspondente a 70% (setenta por cento), deverá ser pago até 07 (sete) dias antes da data do evento, sendo o valor de R$ 2.303,00 (dois mil, trezentos e três reais).",
        imagem: "b-saldo",
      },
    },
    {
      id: "estudio-materiais",
      titulo: "Cliente envia fotos, vídeos e textos",
      regra: prazo({ quantidade: 30 }),
      regraTexto: "30 dias antes do evento",
      evidencia: {
        rotulo: "Cláusula Segunda, item 8., página 2",
        pagina: 2,
        citacao:
          "Para criação dos vídeos, a CONTRATANTE deverá enviar ao CONTRATADO, com antecedência mínima de 30 (trinta) dias da data do evento: a. Fotos e vídeos em alta resolução que serão utilizados na retrospectiva e no vídeo com IA",
      },
    },
    {
      id: "estudio-informar",
      titulo: "Cliente informa data, local e fornecedor técnico",
      detalhe:
        "Circular de verdade: o prazo para informar a data conta a partir da própria data",
      regra: prazo({ quantidade: 30 }),
      regraTexto: "30 dias antes do evento",
      evidencia: {
        rotulo: "Cláusula Primeira, item 7., página 2",
        pagina: 2,
        citacao:
          "A CONTRATANTE compromete-se a informar ao CONTRATADO, com antecedência mínima de 30 (trinta) dias da data do evento: a. Data, local e tipo de evento; b. Contato do fornecedor técnico responsável pela tela/projeção",
      },
    },
    {
      id: "estudio-cancel-30",
      titulo: "Cancelando até aqui, a cliente deve 30%",
      valor: 987,
      regra: prazo({ quantidade: 60 }),
      regraTexto: "60 dias antes do evento",
      evidencia: {
        rotulo: "Cláusula Sétima, item a., página 5",
        pagina: 5,
        citacao:
          "Cancelamento com antecedência superior a 60 (sessenta) dias da data do evento: i. será devido ao CONTRATADO o valor correspondente a 30% (trinta por cento) do valor total do contrato",
      },
    },
    {
      id: "estudio-cancel-50",
      titulo: "Última chance de cancelar devendo 50%",
      valor: 1645,
      regra: prazo({ quantidade: 30 }),
      regraTexto: "30 dias antes do evento",
      evidencia: {
        rotulo: "Cláusula Sétima, item b., página 5",
        pagina: 5,
        citacao:
          "Cancelamento entre 59 (cinquenta e nove) e 30 (trinta) dias antes da data do evento: i. será devido ao CONTRATADO o valor correspondente a 50% (cinquenta por cento) do valor total do contrato",
      },
    },
    {
      id: "estudio-cancel-100",
      titulo: "Daqui em diante, cancelamento deve o valor cheio",
      valor: 3290,
      regra: prazo({ quantidade: 30 }),
      regraTexto: "a partir de 30 dias antes do evento",
      evidencia: {
        rotulo: "Cláusula Sétima, item c., página 5",
        pagina: 5,
        citacao:
          "Cancelamento com antecedência inferior a 30 (trinta) dias da data do evento: i. será devido ao CONTRATADO o valor total do contrato",
      },
    },
    {
      id: "estudio-rescisao",
      titulo: "Atraso da entrada passa de 10 dias: dá direito a rescindir",
      regra: prazo({
        ancora: "parcela",
        ancora_ref: "entrada",
        sentido: "depois",
        quantidade: 10,
      }),
      regraTexto: "10 dias depois do vencimento da entrada",
      evidencia: {
        rotulo: "Cláusula Sétima, item a., página 6",
        pagina: 6,
        citacao:
          "O atraso superior a 10 (dez) dias ou a existência de parcelas em aberto até 48 (quarenta e oito) horas antes do evento autorizará o CONTRATADO a considerar o contrato rescindido por culpa da CONTRATANTE",
      },
    },
    {
      id: "estudio-decisao",
      titulo: "A decisão: rescindir por culpa da contratante",
      condicao: "se houver parcela em aberto",
      regra: prazo({ quantidade: 48, unidade: "horas" }),
      regraTexto: "48 horas antes do evento",
      evidencia: {
        rotulo: "Cláusula Quarta, item b., página 4",
        pagina: 4,
        citacao:
          "Considerar rescindido o contrato por culpa da CONTRATANTE, se persistir atraso até 48 (quarenta e oito) horas antes da data do evento, aplicando-se as penalidades previstas na cláusula sexta.",
      },
    },
    {
      id: "estudio-cronograma",
      titulo: "Cronograma das primeiras versões",
      pendenciaHumana: true,
      semData:
        "O contrato não fixa: diz que será definido entre as partes por escrito",
      evidencia: {
        rotulo: "Cláusula Segunda, item 13., página 3",
        pagina: 3,
        citacao:
          "O cronograma de entrega de primeiras versões será definido entre as partes por escrito (e-mail ou WhatsApp), considerando: a. Prazo para envio de materiais pela CONTRATANTE; b. Data do evento",
      },
    },
    {
      id: "estudio-entrega",
      titulo: "Entrega dos vídeos encerra o contrato",
      semData: "É um marco, não um prazo: a data é a do envio do link",
      evidencia: {
        rotulo: "Cláusula Primeira, item 6., página 2",
        pagina: 2,
        citacao:
          "cujo acesso será enviado à CONTRATANTE por e mail ou WhatsApp, sendo considerada realizada a entrega na data do envio do link funcional.",
      },
    },
    {
      id: "estudio-uso",
      titulo: "Pedido de material para outro uso",
      condicao: "se houver solicitação",
      semData: "Depende da data do uso, que só existe quando houver pedido",
      evidencia: {
        rotulo: "Cláusula Quinta, item 22., página 4",
        pagina: 4,
        citacao:
          "O CONTRATADO poderá disponibilizar à CONTRATANTE, a seu critério, press release e imagens para divulgação, mediante solicitação com antecedência mínima de 10 (dez) dias, sem que isso constitua obrigação essencial.",
      },
    },
  ],
};

/** O terceiro contrato so aparece no fechamento: o usuario do outro lado. */
export const CONTRATO_FILMAGEM = {
  id: "filmagem",
  nome: "Filmagem do casamento",
  contraparte: "Lumen Video Filmes",
  papelUsuario: "cliente" as const,
  pdf: "/contratos/contrato-filmagem-casamento.pdf",
  paginas: 3,
  evento: "2026-05-08",
  valores: { total: 7500, liquido: 7500 },
};
