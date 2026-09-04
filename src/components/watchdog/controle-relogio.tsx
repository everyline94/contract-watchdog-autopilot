import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hrefDemo, type EstadoDemo } from "@/lib/demo/url";

/**
 * O controle do relogio da demo, enfim na tela.
 *
 * O mecanismo sempre existiu (src/lib/clock.ts); o que faltava era um lugar
 * visivel para o tempo andar na frente de quem olha. Cada salto e um link:
 * a pagina re-renderiza no servidor contra o novo agora.
 */
export type SaltoRelogio = {
  rotulo: string;
  /** ISO, ou null para voltar ao relogio real. */
  data: string | null;
};

export function ControleRelogio({
  estado,
  saltos,
  agoraAtivo,
}: {
  estado: EstadoDemo;
  saltos: SaltoRelogio[];
  agoraAtivo: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {saltos.map((s) => {
          const ativo = s.data === agoraAtivo;
          return (
            <Button
              key={s.rotulo}
              size="sm"
              variant={ativo ? "default" : "outline"}
              render={
                <Link href={hrefDemo(estado, { passo: 5, agora: s.data })} />
              }
            >
              {s.rotulo}
            </Button>
          );
        })}
      </div>
      <form method="get" action="/" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="passo" value="5" />
        {estado.evento ? (
          <input type="hidden" name="evento" value={estado.evento} />
        ) : null}
        {Object.entries(estado.feitos).map(([id, data]) => (
          <input key={id} type="hidden" name="feito" value={`${id}.${data}`} />
        ))}
        <label htmlFor="salto-livre" className="text-ui text-texto-suave">
          ou pule para qualquer dia:
        </label>
        <Input type="date" id="salto-livre" name="agora" required className="w-40" />
        <Button size="sm" variant="outline" type="submit">
          Ir
        </Button>
      </form>
    </div>
  );
}
