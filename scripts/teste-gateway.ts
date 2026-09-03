/**
 * Sanidade do AI Gateway: uma chamada minima pelo token OIDC da conta.
 *
 *   vercel env pull .env.gateway --yes   # renova o token (~24h de validade)
 *   npx tsx --env-file=.env.local scripts/teste-gateway.ts
 */
import { generateText } from "ai";

async function main() {
  const r = await generateText({
    model: "anthropic/claude-haiku-4.5",
    prompt: "Responda só com a palavra: funcionou",
  });
  console.log("resposta:", r.text.trim());
  console.log("tokens:", JSON.stringify(r.usage));
}

main().catch((e) => {
  console.error("FALHOU:", e?.message ?? e);
  process.exit(1);
});
