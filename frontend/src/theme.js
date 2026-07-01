import { useEffect, useState } from "react";

// Liest/setzt das Theme ("light" | "dark"). Persistiert in localStorage,
// spiegelt sich als .dark-Klasse am <html>-Element (Tailwind darkMode: "class").
export function useTheme() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch (e) {
      // localStorage nicht verfügbar — ignorieren
    }
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
