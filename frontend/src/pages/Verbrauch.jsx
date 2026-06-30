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

const RANGES = [
  { id: "day", label: "Tag" },
  { id: "week", label: "Woche" },
];

export default function Verbrauch() {
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

  // X-Achse je Zeitraum: Tag -> Uhrzeit, Woche -> Datum + Uhrzeit.
  const fmtAxis = (ts) => {
    const d = new Date(ts);
    if (range === "week") {
      return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" });
    }
    return d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
  };

  // Infozeile: Anzahl Punkte + tatsaechliche Zeitspanne der Daten.
  const span =
    data.length > 0
      ? `${new Date(data[0].ts).toLocaleString("de-CH")} – ${new Date(
          data[data.length - 1].ts
        ).toLocaleString("de-CH")}`
      : null;

  return (
    <div className="space-y-6">
      {/* Zeitraum-Auswahl */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Energieverbrauch</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                range === r.id
                  ? "bg-brand text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Infozeile zum gewaehlten Zeitraum */}
      {span && (
        <div className="text-xs text-slate-500">
          {data.length} Messpunkte · {span}
        </div>
      )}

      {/* Diagramm */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
            Noch keine Messdaten — Backend ein paar Minuten laufen lassen.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="watt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="ts"
                tickFormatter={fmtAxis}
                stroke="#64748b"
                fontSize={12}
                minTickGap={40}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                unit=" W"
                width={55}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: 8,
                  color: "#e2e8f0",
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

      {/* Ersparnis */}
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
          accent="text-amber-400"
        />
        <StatCard
          label="Aus-Zeit"
          value={savings ? fmtDuration(savings.off_seconds) : "—"}
          accent="text-slate-300"
        />
      </div>
      <p className="text-xs text-slate-500">
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
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}
