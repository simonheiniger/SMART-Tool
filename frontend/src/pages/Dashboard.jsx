import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import { UserIcon, UmbrellaIcon, ClockIcon, PowerIcon } from "../icons.jsx";

const REFRESH_MS = 3000;

const MODE_LABEL = {
  presence: { Icon: UserIcon, text: "Anwesenheit" },
  vacation: { Icon: UmbrellaIcon, text: "Ferienmodus" },
  schedule: { Icon: ClockIcon, text: "Zeitplan" },
};

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
  const deviceName = status?.device_name ?? "Gerät";
  const modeInfo = MODE_LABEL[mode];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Geraet + Schalter */}
      <div className="card p-8 flex flex-col items-center gap-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">{deviceName}</h2>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            <modeInfo.Icon className="h-3.5 w-3.5" />
            {modeInfo.text}
          </span>
        </div>

        <button
          onClick={handleToggle}
          disabled={busy || !status}
          className={`relative h-44 w-44 rounded-full text-lg font-bold transition-all duration-200 disabled:opacity-50 ${
            on
              ? "bg-brand text-white shadow-lg shadow-brand/30 hover:bg-brand-dark"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200 ring-1 ring-inset ring-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600 dark:ring-slate-600"
          }`}
        >
          <PowerIcon className="mx-auto mb-1 h-9 w-9" />
          {on ? "EIN" : "AUS"}
        </button>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          {busy ? "Schalte…" : "Tippen zum Ein-/Ausschalten"}
        </p>
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Aktueller Verbrauch"
          value={`${power.toFixed(1)} W`}
          accent={power > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}
        />
        <StatCard
          label="Status"
          value={on ? "Eingeschaltet" : "Ausgeschaltet"}
          accent={on ? "text-brand" : "text-slate-500 dark:text-slate-400"}
        />
        <StatCard
          label="Anwesenheit"
          value={present ? "Jemand da" : "Niemand da"}
          accent={present ? "text-sky-600 dark:text-sky-400" : "text-slate-400"}
        />
        <StatCard
          label="Letzte Aktualisierung"
          value={
            status?.last_update
              ? new Date(status.last_update * 1000).toLocaleTimeString("de-CH")
              : "—"
          }
          accent="text-slate-700 dark:text-slate-200"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}
