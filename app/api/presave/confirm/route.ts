import { cleanText, confirmPresave } from "@/lib/campaign-store";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const token = cleanText(body.token, 80);
    if (!token || !(await confirmPresave(token))) {
      return Response.json({ message: "La sesión de pre-save expiró." }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ message: "No pudimos confirmar el pre-save." }, { status: 503 });
  }
}
