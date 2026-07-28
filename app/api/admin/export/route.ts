import { getAllRegistrations, isAdmin } from "@/lib/campaign-store";

export async function GET(request: Request) {
  if (!isAdmin(request)) return Response.json({ message: "No autorizado." }, { status: 401 });
  try {
    const rows = await getAllRegistrations();
    const escape = (value: string) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [
      "Nombre,Correo,Fuente,Fecha",
      ...rows.map((row) => [row.name, row.email, row.source, row.createdAt].map(escape).join(",")),
    ].join("\n");
    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=registros-placeres.csv",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ message: "No pudimos exportar los registros." }, { status: 503 });
  }
}
