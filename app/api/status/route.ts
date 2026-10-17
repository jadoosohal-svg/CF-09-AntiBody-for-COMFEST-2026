import { connection } from "next/server";
import { hasAnyKey } from "@/lib/ai/models";

// Lets the client decide on Demo Mode without exposing which keys exist.
// connection() keeps this at request time so the answer reflects the runtime env, not the build env.
export async function GET() {
  await connection();
  return Response.json({ live: hasAnyKey() });
}
