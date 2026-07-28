import { getSummary, isAdmin } from "@/lib/campaign-store";

export async function GET(request: Request) {
  if (!isAdmin(request)) return Response.json({ message: "No autorizado." }, { status: 401 });
  try {
    return Response.json(await getSummary());
  } catch {
    return Response.json({ message: "Panel no disponible." }, { status: 503 });
  }
}
