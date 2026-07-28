"use client";

import { FormEvent, useState } from "react";

type DashboardData = {
  registrations: number;
  pageViews: number;
  presaveClicks: number;
  conversion: number;
  sources: Array<{ source: string; registrations: number }>;
  recent: Array<{ name: string; email: string; source: string; createdAt: string }>;
};

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadDashboard(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/summary", { headers: { "x-admin-key": key } });
      if (!response.ok) throw new Error("Clave incorrecta o panel no disponible.");
      setData(await response.json() as DashboardData);
      sessionStorage.setItem("placeres_admin_key", key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos abrir el panel.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadCsv() {
    const adminKey = key || sessionStorage.getItem("placeres_admin_key") || "";
    const response = await fetch("/api/admin/export", { headers: { "x-admin-key": adminKey } });
    if (!response.ok) return setError("No pudimos exportar los registros.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "registros-placeres.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div className="flow-mark">FLOW <strong>NEW YORK</strong></div>
        <span>PLACERES · ANALÍTICA</span>
      </header>
      {!data ? (
        <form className="admin-login" onSubmit={loadDashboard}>
          <p className="eyebrow">Acceso privado</p>
          <h1>Panel de<br />campaña.</h1>
          <label>Clave de acceso<input type="password" value={key} onChange={(event) => setKey(event.target.value)} required /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="submit-button" disabled={loading}>{loading ? "Ingresando..." : "Abrir analítica →"}</button>
        </form>
      ) : (
        <section className="dashboard">
          <div className="dashboard-title">
            <div><p className="eyebrow">Campaña activa</p><h1>Placeres.</h1></div>
            <button onClick={downloadCsv}>Descargar CSV ↓</button>
          </div>
          <div className="metric-grid">
            <article><span>01</span><strong>{data.pageViews}</strong><p>Visitas</p></article>
            <article><span>02</span><strong>{data.presaveClicks}</strong><p>Clics pre-save</p></article>
            <article><span>03</span><strong>{data.registrations}</strong><p>Registros</p></article>
            <article><span>04</span><strong>{data.conversion}%</strong><p>Conversión</p></article>
          </div>
          <div className="admin-tables">
            <section>
              <h2>Fuentes</h2>
              {data.sources.map((source) => <p key={source.source}><span>{source.source}</span><strong>{source.registrations}</strong></p>)}
            </section>
            <section>
              <h2>Registros recientes</h2>
              {data.recent.map((person) => (
                <p key={person.email}><span><b>{person.name}</b><small>{person.email} · {person.source}</small></span><time>{new Date(person.createdAt).toLocaleDateString("es-CL")}</time></p>
              ))}
            </section>
          </div>
        </section>
      )}
    </main>
  );
}
