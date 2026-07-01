import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { api } from "../api.js";
import { useTheme } from "../theme.js";

const RANGES = [
  { id: "day", label: "Tag" },
  { id: "week", label: "Woche" },
];

export default function Verbrauch() {
  const { dark } = useTheme();
  const [range, setRange] = useState("day");
  const [data, setData] = useState([]);
  const [savings, setSavings] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [history, sav] = await Promise.all([
        api.getHistory(range),
        api.getSavings(range),
      ]);
      setData(
        history.map((p) => ({
          ts: p.ts * 1000,
          power_w: Number(p.power_w.toFixed(1)),
        }))
      );
      setSavings(sav);
      setError(null);
    } catch (e) {
      setError("Daten konnten nicht geladen werden");
    }
  }, [range]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const fmtAxis = (ts) => {
    const d = new Date(ts);
    if (range === "week") {
      return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" });
    }
    return d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
  };

  const span =
    data.length > 0
      ? `${new Date(data[0].ts).toLocaleString("de-CH")} – ${new Date(
          data[data.length - 1].ts
        ).toLocaleString("de-CH")}`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Energieverbrauch</h2>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                range === r.id
                  ? "bg-white text-brand shadow-sm dark:bg-slate-700"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-300">
          {error}
        </div>
      )}

      {span && (
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {data.length} Messpunkte · {span}
        </div>
      )}

      <div className="card p-4">
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            Noch keine Messdaten — Backend ein paar Minuten laufen lassen.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="watt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={dark ? "#334155" : "#e2e8f0"} vertical={false} />
              <XAxis
                dataKey="ts"
                tickFormatter={fmtAxis}
                stroke={dark ? "#64748b" : "#94a3b8"}
                fontSize={12}
                minTickGap={40}
              />
              <YAxis
                stroke={dark ? "#64748b" : "#94a3b8"}
                fontSize={12}
                unit=" W"
                width={55}
              />
              <Tooltip
                contentStyle={{
                  background: dark ? "#1e293b" : "#ffffff",
                  border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
                  borderRadius: 8,
                  color: dark ? "#f1f5f9" : "#0f172a",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                labelFormatter={(ts) => new Date(ts).toLocaleString("de-CH")}
                formatter={(v) => [`${v} W`, "Leistung"]}
              />
              <Area
                type="monotone"
                dataKey="power_w"
                stroke="#16a34a"
                strokeWidth={2}
                fill="url(#watt)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Gespart"
          value={savings ? `${savings.saved_kwh.toFixed(3)} kWh` : "—"}
          accent="text-brand"
        />
        <StatCard
          label="Gespart"
          value={savings ? `${savings.saved_chf.toFixed(2)} CHF` : "—"}
          accent="text-brand"
        />
        <StatCard
          label="Verbraucht"
          value={savings ? `${savings.consumed_kwh.toFixed(3)} kWh` : "—"}
          accent="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Aus-Zeit"
          value={savings ? fmtDuration(savings.off_seconds) : "—"}
          accent="text-slate-700 dark:text-slate-200"
        />
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Ersparnis = angenommener Standby-Verbrauch × Zeit, in der das Tool das Gerät
        komplett ausgeschaltet hat. Standby-Watt und Strompreis unter „Einstellungen".
      </p>
    </div>
  );
}

function fmtDuration(seconds) {
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

function StatCard({ label, value, accent }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}
