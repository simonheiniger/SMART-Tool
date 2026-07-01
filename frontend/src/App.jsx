import { useState } from "react";
import Dashboard from "./pages/Dashboard.jsx";
import Verbrauch from "./pages/Verbrauch.jsx";
import Einstellungen from "./pages/Einstellungen.jsx";
import { useTheme } from "./theme.js";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "verbrauch", label: "Verbrauch" },
  { id: "einstellungen", label: "Einstellungen" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const { dark, toggle } = useTheme();

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-lg">
              ⚡
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight">Standby-Tool</h1>
              <p className="text-xs text-slate-500 leading-tight dark:text-slate-400">
                Energie-Monitoring &amp; Steuerung
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <nav className="flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    tab === t.id
                      ? "bg-brand text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <button
              onClick={toggle}
              aria-label={dark ? "Hellen Modus" : "Dunklen Modus"}
              title={dark ? "Hellen Modus" : "Dunklen Modus"}
              className="ml-1 grid h-9 w-9 place-items-center rounded-lg text-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8">
          {tab === "dashboard" && <Dashboard />}
          {tab === "verbrauch" && <Verbrauch />}
          {tab === "einstellungen" && <Einstellungen />}
        </div>
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
        Gruppe 1 · Steigerung der Energieeffizienz durch Ausschalten statt Standby
      </footer>
    </div>
  );
}
