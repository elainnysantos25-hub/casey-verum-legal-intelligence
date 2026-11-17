import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-casey.jpeg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CASEY VERUM — Inteligência Jurídica" },
      { name: "description", content: "Plataforma jurídica com IA para análise de casos, memória da banca e teste de teses, com base no acervo do escritório." },
      { property: "og:title", content: "CASEY VERUM — Inteligência Jurídica" },
      { property: "og:description", content: "O conhecimento da banca. Em movimento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);
  const cta = signedIn ? "/painel" : "/auth";
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px clamp(18px,4vw,48px)" }}>
      <div className="hero" style={{ minHeight: 420, display: "grid", alignItems: "center" }}>
        <div className="copy">
          <img className="landing-brand" src={logo.url} alt="CASEY — logo" style={{ width: 180, marginLeft: -20 }} />
          <div className="eyebrow">CASEY VERUM · INTELIGÊNCIA JURÍDICA CONTEXTUAL</div>
          <h1 style={{ marginTop: 10 }}>
            O conhecimento da banca.
            <br />
            <span>Em movimento.</span>
          </h1>
          <p className="sub">
            Envie contratos, petições e pareceres. A Casey analisa casos, consulta o que a banca já registrou e testa teses
            jurídicas — sempre citando as fontes do seu acervo.
          </p>
          <div className="actions">
            <Link to={cta} className="btn primary">{signedIn ? "Abrir a plataforma ↗" : "Entrar ↗"}</Link>
            {!signedIn && <Link to="/auth" className="btn">Criar conta</Link>}
          </div>
        </div>
      </div>
      <div className="grid">
        <div className="card"><div className="symbol">⌘</div><h3>Análise de casos</h3><p>Questões jurídicas, fundamentos, argumentos favoráveis e contrários, provas, riscos e estratégias.</p></div>
        <div className="card"><div className="symbol">◈</div><h3>Memória da banca</h3><p>Pergunte o que o escritório já trabalhou. Respostas apenas com base nos registros — sem inventar.</p></div>
        <div className="card"><div className="symbol">⚖</div><h3>Teste de teses</h3><p>Veredito crítico, fragilidades, contra-argumentos e como fortalecer a tese.</p></div>
      </div>
      <footer className="small muted divider">CASEY VERUM · Análises geradas por IA são preliminares e devem ser revisadas por profissional habilitado.</footer>
    </div>
  );
}
