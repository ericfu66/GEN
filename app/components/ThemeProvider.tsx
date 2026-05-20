"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {}
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = readStoredTheme();
    const prefersDark = safePrefersDark();
    const initial: Theme = saved ?? (prefersDark ? "dark" : "light");
    setTheme(initial);
    setDocumentTheme(initial);
  }, []);

  useEffect(() => {
    if (mounted) {
      setDocumentTheme(theme);
      writeStoredTheme(theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem("qy-theme");
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function writeStoredTheme(theme: Theme) {
  try {
    window.localStorage.setItem("qy-theme", theme);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function safePrefersDark() {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return true;
  }
}

function setDocumentTheme(theme: Theme) {
  try {
    document.documentElement.setAttribute("data-theme", theme);
  } catch {
    // Ignore non-browser edge cases.
  }
}
