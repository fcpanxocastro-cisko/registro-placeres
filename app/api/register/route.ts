import { cleanText, createRegistration } from "@/lib/campaign-store";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const name = cleanText(body.name, 80);
    const email = cleanText(body.email, 120).toLowerCase();
    const source = cleanText(body.source, 80) || "direct";
    const presaveToken = cleanText(body.presaveToken, 80);
    const website = cleanText(body.website, 200);

    if (website) return Response.json({ ok: true });
    if (name.length < 2) return Response.json({ message: "Ingresa tu nombre." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ message: "Ingresa un correo válido." }, { status: 400 });
    if (body.consent !== true) return Response.json({ message: "Debes aceptar el uso de tus datos para esta invitación." }, { status: 400 });

    const result = await createRegistration({ name, email, source, presaveToken });
    if (result.status === "presave") {
      return Response.json({ message: "Primero debes completar y confirmar el pre-save." }, { status: 403 });
    }
    if (result.status === "duplicate") {
      return Response.json({ message: "Este correo ya está registrado." }, { status: 409 });
    }
    return Response.json({ ok: true, message: "Registro recibido." }, { status: 201 });
  } catch {
    return Response.json({ message: "No pudimos guardar tu registro. Inténtalo nuevamente." }, { status: 503 });
  }
}
