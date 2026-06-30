import { useState } from "react";
import Dashboard from "./pages/Dashboard.jsx";
import Verbrauch from "./pages/Verbrauch.jsx";
import Einstellungen from "./pages/Einstellungen.jsx";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "verbrauch", label: "Verbrauch" },
  { id: "einstellungen", label: "Einstellungen" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-lg font-semibold">Standby-Tool</h1>
          </div>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  tab === t.id
                    ? "bg-brand text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {tab === "dashboard" && <Dashboard />}
          {tab === "verbrauch" && <Verbrauch />}
          {tab === "einstellungen" && <Einstellungen />}
        </div>
      </main>

      <footer className="border-t border-slate-800 py-3 text-center text-xs text-slate-500">
        Gruppe 1 · Steigerung der Energieeffizienz durch Ausschalten statt Standby
      </footer>
    </div>
  );
}
