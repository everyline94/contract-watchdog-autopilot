"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** O provider do TanStack Query, um por sessao de navegacao. */
export function Provedores({ children }: { children: React.ReactNode }) {
  const [cliente] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5_000, retry: 1 },
        },
      }),
  );
  return (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
}
