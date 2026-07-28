"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const PRESAVE_URL = "https://Ithann-NY.lnk.to/PLACERES";
const EVENT_DATE = new Date("2026-08-05T00:00:00-04:00").getTime();

const socialLinks = [
  { name: "Instagram", href: "https://www.instagram.com/ithannewyork/", icon: "https://cdn.simpleicons.org/instagram/ffffff" },
  { name: "YouTube", href: "https://www.youtube.com/channel/UCHUwaZ29fbxOHBmk32U-Xdw", icon: "https://cdn.simpleicons.org/youtube/ffffff" },
  { name: "Spotify", href: "https://open.spotify.com/intl-es/artist/0LshXUmIub6xKvOq4QmtNs", icon: "https://cdn.simpleicons.org/spotify/ffffff" },
  { name: "Apple Music", href: "https://music.apple.com/ar/artist/ithan-ny/1491820864", icon: "https://cdn.simpleicons.org/applemusic/ffffff" },
];

function getSource() {
  if (typeof window === "undefined") return "direct";
  const params = new URLSearchParams(window.location.search);
  return params.get("utm_source") || params.get("source") || "direct";
}

async function track(eventType: string) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, source: getSource() }),
    });
  } catch {
    // La analítica nunca debe interrumpir la experiencia.
  }
}

export default function PlaceresPage() {
  const [presaveStarted, setPresaveStarted] = useState(false);
  const [presaveToken, setPresaveToken] = useState("");
  const [confirmingPresave, setConfirmingPresave] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (!sessionStorage.getItem("placeres_page_view")) {
      sessionStorage.setItem("placeres_page_view", "1");
      void track("page_view");
    }

    const update = () => {
      const distance = Math.max(0, EVENT_DATE - Date.now());
      setRemaining({
        days: Math.floor(distance / 86400000),
        hours: Math.floor((distance % 86400000) / 3600000),
        minutes: Math.floor((distance % 3600000) / 60000),
      });
    };
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = useMemo(
    () => [
      { value: String(remaining.days).padStart(2, "0"), label: "Días" },
      { value: String(remaining.hours).padStart(2, "0"), label: "Horas" },
      { value: String(remaining.minutes).padStart(2, "0"), label: "Min" },
    ],
    [remaining],
  );

  async function handlePresave() {
    window.open(PRESAVE_URL, "_blank", "noopener,noreferrer");
    setPresaveStarted(true);
    setMessage("");
    setTimeout(() => document.getElementById("registro")?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
    try {
      const response = await fetch("/api/presave/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: getSource() }),
      });
      const data = (await response.json()) as { token?: string };
      if (!response.ok || !data.token) throw new Error();
      setPresaveToken(data.token);
    } catch {
      setMessage("No pudimos iniciar la verificación. Inténtalo nuevamente.");
    }
  }

  async function handleConfirmPresave() {
    if (!presaveToken) return;
    setConfirmingPresave(true);
    setMessage("");
    try {
      const response = await fetch("/api/presave/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: presaveToken }),
      });
      if (!response.ok) throw new Error();
      setUnlocked(true);
      void track("form_view");
    } catch {
      setMessage("No pudimos validar este paso. Vuelve a abrir el pre-save e inténtalo nuevamente.");
    } finally {
      setConfirmingPresave(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          presaveToken,
          consent: form.get("consent") === "on",
          website: form.get("website"),
          source: getSource(),
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "No pudimos completar el registro.");
      setSubmitted(true);
      void track("registration_success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos completar el registro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <video className="hero-video" autoPlay muted loop playsInline poster="/placeres-cover.png">
          <source src="/placeres-teaser.mp4" type="video/mp4" />
        </video>
        <div className="hero-shade" />
        <header className="topbar">
          <div className="flow-mark">FLOW <strong>NEW YORK</strong></div>
          <span>ITHAN NY · 2026</span>
        </header>

        <div className="hero-copy">
          <p className="eyebrow">Próximo álbum · 06.08.2026</p>
          <h1>Placeres</h1>
          <p className="lead">Escucha el álbum con tu artista favorito.</p>
          <div className="event-line">
            <span>05 AGO</span>
            <span>ÑUÑOA · SANTIAGO</span>
            <span>EVENTO EXCLUSIVO · CUPOS LIMITADOS</span>
          </div>
          <button className="primary-button" onClick={handlePresave}>
            <span>01</span> Hacer pre-save y registrarme <b>↗</b>
          </button>
        </div>

        <div className="countdown" aria-label="Cuenta regresiva para la escucha privada">
          {countdown.map((item) => (
            <div key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="scroll-cue">Desliza para participar ↓</div>
      </section>

      <section className="experience" id="registro">
        <div className="experience-image">
          <img src="/ithan-chair.jpeg" alt="Ithan NY en una escena oscura del universo Placeres" />
          <div className="image-index">01 / EXPERIENCIA</div>
        </div>

        <div className="registration-panel">
          <p className="eyebrow">Escucha privada · 05 de agosto</p>
          <h2>Vive<br />Placeres<br /><em>antes.</em></h2>
          <p className="panel-copy">
            Ithan NY invita a su comunidad a escuchar el álbum antes de su lanzamiento.
            Entre todas las personas registradas se seleccionará un grupo de invitados.
          </p>

          {!unlocked && !presaveStarted ? (
            <div className="locked-card">
              <span>01</span>
              <div>
                <strong>Primero haz el pre-save</strong>
                <p>Al completar este paso se habilitará tu registro para la escucha.</p>
              </div>
              <button onClick={handlePresave}>Ir al pre-save ↗</button>
            </div>
          ) : !unlocked ? (
            <div className="presave-return">
              <span className="presave-return-number">01</span>
              <div>
                <p className="eyebrow">Pre-save abierto</p>
                <h3>Completa el pre-save y vuelve aquí.</h3>
                <p>El registro seguirá bloqueado hasta que confirmes este paso.</p>
              </div>
              {message && <p className="form-error" role="alert">{message}</p>}
              <button className="submit-button" onClick={handleConfirmPresave} disabled={!presaveToken || confirmingPresave}>
                {confirmingPresave ? "Validando..." : "Ya hice el pre-save"} <b>→</b>
              </button>
              <button className="presave-again" onClick={handlePresave}>Volver a abrir el pre-save ↗</button>
            </div>
          ) : submitted ? (
            <div className="success-card" role="status">
              <span>✓</span>
              <p className="eyebrow">Registro recibido</p>
              <h3>Ya estás participando.</h3>
              <p>Si eres seleccionado recibirás por correo la confirmación, dirección y horario.</p>
            </div>
          ) : (
            <form className="registration-form" onSubmit={handleSubmit}>
              <div className="step-label"><span>02</span> Completa tu registro</div>
              <label>
                Nombre
                <input name="name" type="text" autoComplete="name" minLength={2} maxLength={80} required placeholder="Tu nombre" />
              </label>
              <label>
                Correo
                <input name="email" type="email" autoComplete="email" maxLength={120} required placeholder="tu@correo.com" />
              </label>
              <input className="honey" name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <label className="check">
                <input name="consent" type="checkbox" required />
                <span>Acepto que Flow New York y Distrikt usen estos datos para gestionar esta invitación.</span>
              </label>
              {message && <p className="form-error" role="alert">{message}</p>}
              <button className="submit-button" type="submit" disabled={loading}>
                {loading ? "Registrando..." : "Quiero participar"} <b>→</b>
              </button>
              <small>Registrarte no garantiza una invitación. Las personas seleccionadas serán contactadas por correo.</small>
            </form>
          )}
        </div>
      </section>

      <section className="story">
        <div className="story-copy">
          <p className="eyebrow">Una noche · Un álbum · Un encuentro</p>
          <h2>Antes que<br />el mundo.</h2>
          <p>Una experiencia cercana con Ithan NY para conocer el universo de “Placeres” un día antes de su lanzamiento oficial.</p>
        </div>
        <div className="photo photo-one"><img src="/ithan-night.jpeg" alt="Ithan NY durante una sesión nocturna" /></div>
        <div className="photo photo-two"><img src="/ithan-red.jpeg" alt="Ithan NY en una composición roja y azul" /></div>
      </section>

      <section className="social-section">
        <p className="eyebrow">Sigue el movimiento</p>
        <h2>ITHAN NY<br /><em>EN TODAS PARTES.</em></h2>
        <div className="social-grid">
          {socialLinks.map((social, index) => (
            <a key={social.name} href={social.href} target="_blank" rel="noreferrer" onClick={() => void track(`social_${social.name.toLowerCase().replace(" ", "_")}`)}>
              <span>0{index + 1}</span>
              <img src={social.icon} alt="" />
              <strong>{social.name}</strong>
              <b>↗</b>
            </a>
          ))}
        </div>
      </section>

      <footer>
        <div className="footer-flow">FLOW <strong>NEW YORK</strong></div>
        <p>Placeres · Escucha privada · 2026</p>
        <div className="distrikt-brand" aria-label="By Distrikt, estrategia, música, contenido y tecnología">
          <span className="distrikt-by">BY</span>
          <div>
            <strong className="distrikt-logo">
              D<span>!</span>STR<span>!</span>KT<sup>®</sup>
            </strong>
            <small>ESTRATEGIA · MÚSICA · CONTENIDO · TECNOLOGÍA</small>
          </div>
        </div>
      </footer>
    </main>
  );
}
