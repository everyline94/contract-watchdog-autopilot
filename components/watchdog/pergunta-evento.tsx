import * as React from "react";

import { BotaoAcao } from "@/components/botao-acao";
import { Input } from "@/components/ui/input";
import type { EstadoDemo } from "@/lib/demo/url";

/**
 * A pergunta que o sistema abre quando o contrato nao diz a data do evento.
 *
 * Form GET de proposito: a resposta vira parametro na URL, a pagina
 * re-renderiza no servidor e o motor calcula na hora. Sem estado escondido.
 */
export function PerguntaEvento({ estado }: { estado: EstadoDemo }) {
  return (
    <form method="get" action="/" className="flex flex-col gap-3">
      <input type="hidden" name="passo" value="4" />
      {estado.agora ? (
        <input type="hidden" name="agora" value={estado.agora} />
      ) : null}
      {Object.entries(estado.feitos).map(([id, data]) => (
        <input key={id} type="hidden" name="feito" value={`${id}.${data}`} />
      ))}
      <label htmlFor="resposta-evento" className="text-corpo font-medium">
        Qual é a data do evento?
      </label>
      <div className="flex flex-wrap items-center gap-2.5">
        <Input
          type="date"
          id="resposta-evento"
          name="evento"
          required
          className="w-44"
        />
        <BotaoAcao type="submit">Responder</BotaoAcao>
      </div>
      <p className="text-ui text-texto-suave">
        Qualquer data serve: o que está no contrato são regras, e o motor
        calcula a partir da resposta.
      </p>
    </form>
  );
}
