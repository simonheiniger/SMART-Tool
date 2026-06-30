import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";

const REFRESH_MS = 3000;

export default function Dashboard() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.getStatus();
      setStatus(s);
      setError(null);
    } catch (e) {
      setError("Backend nicht erreichbar");
    }
  }, []);

  // Auto-Refresh.
  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  async function handleToggle() {
    if (!status) return;
    setBusy(true);
    try {
      const s = await api.toggle(!status.on);
      setStatus(s);
      setError(null);
    } catch (e) {
      setError("Schalten fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  const on = status?.on ?? false;
  const power = status?.power_w ?? 0;
  const present = status?.present ?? false;
  const mode = status?.mode ?? "presence";
  const MODE_LABEL = {
    presence: { icon: "👤", text: "Anwesenheit" },
    vacation: { icon: "🏖️", text: "Ferienmodus" },
    schedule: { icon: "🕒", text: "Zeitplan" },
  }[mode];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Aktiver Modus */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-1.5 text-sm text-slate-300">
          <span>{MODE_LABEL.icon}</span>
          <span>Modus: {MODE_LABEL.text}</span>
        </span>
      </div>

      {/* Grosser Schalter */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 flex flex-col items-center gap-6">
        <button
          onClick={handleToggle}
          disabled={busy || !status}
          className={`relative h-44 w-44 rounded-full text-xl font-bold transition-all disabled:opacity-50 ${
            on
              ? "bg-brand shadow-[0_0_40px_-5px] shadow-brand text-white hover:bg-brand-dark"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          <span className="block text-4xl mb-1">⏻</span>
          {on ? "EIN" : "AUS"}
        </button>
        <p className="text-sm text-slate-400">
          {busy ? "Schalte…" : "Tippen zum Ein-/Ausschalten"}
        </p>
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Aktueller Verbrauch"
          value={`${power.toFixed(1)} W`}
          accent={power > 0 ? "text-amber-400" : "text-slate-400"}
        />
        <StatCard
          label="Status"
          value={on ? "Eingeschaltet" : "Ausgeschaltet"}
          accent={on ? "text-brand" : "text-slate-400"}
        />
        <StatCard
          label="Anwesenheit"
          value={present ? "Jemand da" : "Niemand da"}
          accent={present ? "text-sky-400" : "text-slate-500"}
        />
        <StatCard
          label="Letzte Aktualisierung"
          value={
            status?.last_update
              ? new Date(status.last_update * 1000).toLocaleTimeString("de-CH")
              : "—"
          }
          accent="text-slate-300"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}
