"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="themeToggle"
      onClick={toggleTheme}
      title={theme === "dark" ? "切换到浅色主题" : "切换到暗色主题"}
      aria-label="切换主题"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
