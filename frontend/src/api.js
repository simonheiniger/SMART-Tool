// Duenner Fetch-Wrapper zum Backend. Alle Pfade relativ ("/api/..."),
// im Dev leitet der Vite-Proxy sie ans Backend (Port 8000).

async function request(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getStatus: () => request("/api/status"),
  toggle: (on) =>
    request("/api/toggle", { method: "POST", body: JSON.stringify({ on }) }),
  getHistory: (range = "day") => request(`/api/history?range=${range}`),
  getSavings: (range = "day") => request(`/api/savings?range=${range}`),
  getSettings: () => request("/api/settings"),
  putSettings: (settings) =>
    request("/api/settings", { method: "PUT", body: JSON.stringify(settings) }),
};
