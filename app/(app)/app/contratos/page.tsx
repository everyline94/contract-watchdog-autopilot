import { redirect } from "next/navigation";

/**
 * A lista de contratos mora no dashboard, na tabela de contratos recentes.
 * Esta rota existe so pra quem chega por link antigo ou digitando na barra:
 * sem ela o 404 vem cru, fora do layout do app, sem sidebar e sem marca.
 */
export default function PaginaContratos() {
  redirect("/app");
}
