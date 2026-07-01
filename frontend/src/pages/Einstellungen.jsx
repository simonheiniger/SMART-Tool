import { useEffect, useState } from "react";
import { api } from "../api.js";

const PRESENCE_OPTIONS = [
  { value: "null", label: "Automatisch (real erkennen)" },
  { value: "true", label: "Immer anwesend (Test)" },
  { value: "false", label: "Immer abwesend (Test)" },
];

const MODES = [
  { id: "presence", label: "Anwesenheit", icon: "👤", hint: "Schaltet automatisch ab, wenn niemand da ist." },
  { id: "vacation", label: "Ferien", icon: "🏖️", hint: "Gerät bleibt aus bis zum Rückkehr-Datum." },
  { id: "schedule", label: "Zeitplan", icon: "🕒", hint: "Gerät an/aus nach festen Uhrzeiten." },
];

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]; // Index = 0..6 (Mo..So)

export default function Einstellungen() {
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState(null); // "saved" | "error" | null
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then((s) =>
        setForm({
          device_name: s.device_name || "Gerät",
          off_delay_s: s.off_delay_s,
          standby_w: s.standby_w,
          price_per_kwh: s.price_per_kwh,
          presence_override:
            s.presence_override === null ? "null" : String(s.presence_override),
          mode: s.mode || "presence",
          vacation_until: s.vacation_until ? s.vacation_until.slice(0, 16) : "",
          schedule: s.schedule || [],
        })
      )
      .catch(() => setStatus("error"));
  }, []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus(null);
  }

  function addWindow() {
    update("schedule", [
      ...form.schedule,
      { days: [0, 1, 2, 3, 4], on_time: "08:00", off_time: "18:00" },
    ]);
  }
  function removeWindow(i) {
    update("schedule", form.schedule.filter((_, idx) => idx !== i));
  }
  function setWindow(i, key, value) {
    update(
      "schedule",
      form.schedule.map((w, idx) => (idx === i ? { ...w, [key]: value } : w))
    );
  }
  function toggleDay(i, day) {
    const w = form.schedule[i];
    const days = w.days.includes(day)
      ? w.days.filter((d) => d !== day)
      : [...w.days, day].sort((a, b) => a - b);
    setWindow(i, "days", days);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        device_name: form.device_name.trim() || "Gerät",
        off_delay_s: Number(form.off_delay_s),
        standby_w: Number(form.standby_w),
        price_per_kwh: Number(form.price_per_kwh),
        presence_override:
          form.presence_override === "null"
            ? null
            : form.presence_override === "true",
        mode: form.mode,
        vacation_until:
          form.mode === "vacation" && form.vacation_until
            ? form.vacation_until
            : null,
        schedule: form.schedule,
      };
      await api.putSettings(payload);
      setStatus("saved");
    } catch (e) {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <div className="card p-8 text-center text-slate-400">
        {status === "error" ? "Backend nicht erreichbar" : "Lade Einstellungen…"}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Gerät */}
      <section className="card p-6">
        <Field
          label="Gerätename"
          hint="Name des angeschlossenen Geräts (z.B. Kaffeemaschine). Wird im Dashboard angezeigt."
        >
          <input
            type="text"
            maxLength={40}
            value={form.device_name}
            onChange={(e) => update("device_name", e.target.value)}
            className="input"
            placeholder="z.B. Kaffeemaschine"
          />
        </Field>
      </section>

      {/* Betriebsmodus */}
      <section className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Betriebsmodus</h2>
        <div className="grid grid-cols-3 gap-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => update("mode", m.id)}
              className={`rounded-xl border p-4 text-center transition ${
                form.mode === m.id
                  ? "border-brand bg-brand/5 ring-1 ring-brand/30"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="text-2xl">{m.icon}</div>
              <div className="mt-1 text-sm font-medium">{m.label}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {MODES.find((m) => m.id === form.mode)?.hint}
        </p>

        {form.mode === "vacation" && (
          <Field
            label="Rückkehr-Datum / -Zeit"
            hint="Bis dahin bleibt das Gerät aus. Danach automatisch zurück auf Anwesenheit."
          >
            <input
              type="datetime-local"
              value={form.vacation_until}
              onChange={(e) => update("vacation_until", e.target.value)}
              className="input"
            />
          </Field>
        )}

        {form.mode === "schedule" && (
          <div className="space-y-3">
            {form.schedule.length === 0 && (
              <p className="text-sm text-slate-500">
                Noch keine Zeitfenster. Füge eines hinzu.
              </p>
            )}
            {form.schedule.map((w, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((d, di) => (
                    <button
                      key={di}
                      type="button"
                      onClick={() => toggleDay(i, di)}
                      className={`w-9 h-9 rounded-md text-xs font-medium transition ${
                        w.days.includes(di)
                          ? "bg-brand text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500">An</span>
                  <input
                    type="time"
                    value={w.on_time}
                    onChange={(e) => setWindow(i, "on_time", e.target.value)}
                    className="input w-32"
                  />
                  <span className="text-slate-500">Aus</span>
                  <input
                    type="time"
                    value={w.off_time}
                    onChange={(e) => setWindow(i, "off_time", e.target.value)}
                    className="input w-32"
                  />
                  <button
                    type="button"
                    onClick={() => removeWindow(i)}
                    className="ml-auto text-red-500 hover:text-red-600 text-sm"
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addWindow}
              className="text-sm text-brand hover:text-brand-dark font-medium"
            >
              + Zeitfenster hinzufügen
            </button>
          </div>
        )}
      </section>

      {/* Anwesenheit (nur im Anwesenheitsmodus) */}
      {form.mode === "presence" && (
        <section className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold">Anwesenheit</h2>
          <Field
            label="Abschaltverzögerung"
            hint="Wie lange niemand anwesend sein muss, bevor automatisch abgeschaltet wird."
            suffix="Sekunden"
          >
            <input
              type="number"
              min="0"
              value={form.off_delay_s}
              onChange={(e) => update("off_delay_s", e.target.value)}
              className="input"
            />
          </Field>
          <Field
            label="Anwesenheits-Quelle"
            hint="Normalerweise automatisch. Zum Testen erzwingbar."
          >
            <select
              value={form.presence_override}
              onChange={(e) => update("presence_override", e.target.value)}
              className="input"
            >
              {PRESENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </section>
      )}

      {/* Ersparnis-Parameter */}
      <section className="card p-6 space-y-6">
        <h2 className="text-lg font-semibold">Ersparnis-Berechnung</h2>
        <Field
          label="Angenommener Standby-Verbrauch"
          hint="Leistung, die das Gerät im Standby ziehen würde — Basis der Ersparnis."
          suffix="Watt"
        >
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.standby_w}
            onChange={(e) => update("standby_w", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Strompreis" hint="Für die Umrechnung der Ersparnis in CHF." suffix="CHF/kWh">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price_per_kwh}
            onChange={(e) => update("price_per_kwh", e.target.value)}
            className="input"
          />
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white font-medium shadow-sm transition disabled:opacity-50"
        >
          {saving ? "Speichere…" : "Speichern"}
        </button>
        {status === "saved" && <span className="text-sm text-brand">Gespeichert ✓</span>}
        {status === "error" && (
          <span className="text-sm text-red-500">Fehler beim Speichern</span>
        )}
      </div>
    </form>
  );
}

function Field({ label, hint, suffix, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {hint && <p className="text-xs text-slate-500 mt-0.5 mb-2">{hint}</p>}
      <div className="flex items-center gap-2">
        <div className="flex-1">{children}</div>
        {suffix && <span className="text-sm text-slate-400 w-20">{suffix}</span>}
      </div>
    </div>
  );
}
