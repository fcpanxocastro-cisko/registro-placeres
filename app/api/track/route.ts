import { cleanText, trackEvent } from "@/lib/campaign-store";

const allowedEvents = new Set([
  "page_view",
  "form_view",
  "registration_success",
  "social_instagram",
  "social_youtube",
  "social_spotify",
  "social_apple_music",
]);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const eventType = cleanText(body.eventType, 40);
    if (!allowedEvents.has(eventType)) return Response.json({ message: "Evento inválido." }, { status: 400 });
    await trackEvent(eventType);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
