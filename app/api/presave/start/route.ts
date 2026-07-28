import { cleanText, startPresave } from "@/lib/campaign-store";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const source = cleanText(body.source, 80) || "direct";
    return Response.json({ token: await startPresave(source) }, { status: 201 });
  } catch {
    return Response.json({ message: "No pudimos iniciar la verificación." }, { status: 503 });
  }
}
