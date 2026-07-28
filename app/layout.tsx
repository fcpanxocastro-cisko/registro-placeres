import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Placeres — Escucha privada con Ithan NY",
  description: "Haz el pre-save de Placeres y regístrate para vivir una escucha privada con Ithan NY en Ñuñoa, Santiago.",
  openGraph: {
    title: "Placeres — Escucha privada con Ithan NY",
    description: "05 de agosto · Ñuñoa, Santiago · Cupos limitados.",
    images: [{ url: "/ithan-red.jpeg", width: 853, height: 1280, alt: "Ithan NY — escucha privada de Placeres en Ñuñoa" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Placeres — Escucha privada con Ithan NY",
    description: "Haz el pre-save y participa por una invitación.",
    images: ["/ithan-red.jpeg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
