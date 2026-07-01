import { useEffect, useState, useCallback, useMemo } from "react";
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

// Start des lokalen Tages (00:00) fuer einen Zeitstempel in ms.
function dayStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function Verbrauch() {
  const { dark } = useTheme();
  const [range, setRange] = useState("day");
  // Nur im Wochen-Modus: ein angewaehlter Tag (ms, Tagesbeginn) oder null = ganze Woche.
  const [selectedDay, setSelectedDay] = useState(null);
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

  // Beim Wechsel der Zeitspanne die Tages-Auswahl zuruecksetzen.
  const changeRange = (id) => {
    setRange(id);
    setSelectedDay(null);
  };

  // Im Wochen-Modus die einzelnen Tage aus den Daten ableiten (fuer die Auswahl unten).
  const weekDays = useMemo(() => {
    if (range !== "week") return [];
    const set = new Map();
    for (const p of data) set.set(dayStart(p.ts), true);
    return [...set.keys()].sort((a, b) => a - b);
  }, [range, data]);

  // Ist ein Einzeltag angewaehlt? -> Daten auf diesen Tag filtern.
  const drillDay = range === "week" && selectedDay != null;
  const chartData = useMemo(() => {
    if (!drillDay) return data;
    const end = selectedDay + 24 * 3600 * 1000;
    return data.filter((p) => p.ts >= selectedDay && p.ts < end);
  }, [drillDay, selectedDay, data]);

  // X-Achse: Einzeltag/Tag -> Uhrzeit, ganze Woche -> Datum.
  const fmtAxis = (ts) => {
    const d = new Date(ts);
    if (range === "week" && !drillDay) {
      return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" });
    }
    return d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
  };

  const span =
    chartData.length > 0
      ? `${new Date(chartData[0].ts).toLocaleString("de-CH")} – ${new Date(
          chartData[chartData.length - 1].ts
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
              onClick={() => changeRange(r.id)}
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
          {chartData.length} Messpunkte · {span}
        </div>
      )}

      <div className="card p-4">
        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            {drillDay
              ? "Keine Messdaten für diesen Tag."
              : "Noch keine Messdaten — Backend ein paar Minuten laufen lassen."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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

      {/* Im Wochen-Modus: Tag anwaehlen, um ihn genauer zu sehen. */}
      {range === "week" && weekDays.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Tag auswählen für Detailansicht:
          </div>
          <div className="flex flex-wrap gap-1.5">
            <DayChip
              active={selectedDay == null}
              onClick={() => setSelectedDay(null)}
              label="Ganze Woche"
            />
            {weekDays.map((d) => (
              <DayChip
                key={d}
                active={selectedDay === d}
                onClick={() => setSelectedDay(d)}
                label={new Date(d).toLocaleDateString("de-CH", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                })}
              />
            ))}
          </div>
        </div>
      )}

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
        {range === "week"
          ? "Kennzahlen gelten für die ganze Woche. "
          : ""}
        Ersparnis = angenommener Standby-Verbrauch × Zeit, in der das Tool das Gerät
        komplett ausgeschaltet hat. Standby-Watt und Strompreis unter „Einstellungen".
      </p>
    </div>
  );
}

function DayChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
        active
          ? "bg-brand text-white shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
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
