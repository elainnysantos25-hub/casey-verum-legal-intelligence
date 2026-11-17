import { Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import logo from "@/assets/logo-casey.jpeg.asset.json";
import { overviewQuery } from "@/lib/casey/queries";

const NAV = [
  { to: "/", ico: "⌂", label: "Visão geral" },
  { to: "/pesquisa", ico: "⌕", label: "Pesquisa jurídica" },
  { to: "/biblioteca", ico: "▤", label: "Biblioteca" },
  { to: "/memoria", ico: "◈", label: "Memória da banca" },
  { to: "/analise", ico: "⌘", label: "Análise de casos" },
  { to: "/teses", ico: "⚖", label: "Teste de teses" },
  { to: "/configuracoes", ico: "⚙", label: "Configurações" },
] as const;

export function AppShell() {
  const overview = useQuery(overviewQuery());
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }));
  }, []);

  const status = overview.isError
    ? { cls: "status off", text: "Backend não conectado" }
    : !overview.data
      ? { cls: "status warn", text: "Conectando ao serviço de IA..." }
      : overview.data.aiReady
        ? { cls: "status", text: "IA e banco conectados" }
        : { cls: "status warn", text: "IA não configurada" };

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <img src={logo.url} alt="Logo Casey" />
          <div>
            <strong>CASEY</strong>
            <small>VERUM · INTELIGÊNCIA JURÍDICA</small>
          </div>
        </div>
        <div className="navlabel">PLATAFORMA</div>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }} activeProps={{ className: "active" }}>
              <span className="ico">{n.ico}</span> {n.label}
            </Link>
          ))}
        </nav>
        <div className="sidefoot">
          Conhecimento que gera resultado.
          <br />
          <span className="faint">Acervo compartilhado da banca</span>
        </div>
      </aside>
      <main className="main">
        <div className="top">
          <div className="eyebrow">VERUM · AMBIENTE DE TRABALHO</div>
          <div className="topright">
            <span className={status.cls} />
            <span>{status.text}</span>
            <span>·</span>
            <span>{today}</span>
          </div>
        </div>
        <div className="page">
          <Outlet />
        </div>
        <footer className="small muted divider">
          CASEY VERUM · Análises geradas por IA são preliminares e devem ser revisadas por profissional habilitado.
          Documentos marcados como demonstração são fictícios.
        </footer>
      </main>
    </div>
  );
}
