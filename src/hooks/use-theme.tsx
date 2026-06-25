"use client";

import { useEffect, useState } from "react";
import { useTheme as useNextTheme } from "next-themes";

type Theme = "dark" | "light";

export function useTheme() {
  const { theme, setTheme: setNextTheme, resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Antes do mount, evita hydration mismatch (defaultTheme = dark)
  const currentTheme = (
    mounted ? (resolvedTheme ?? theme) : "dark"
  ) as Theme;
  const themeValue = currentTheme;

  const toggleTheme = () => {
    setNextTheme(themeValue === "dark" ? "light" : "dark");
  };

  return {
    theme: themeValue,
    mounted,
    setTheme: (value: Theme) => setNextTheme(value),
    toggleTheme,
  };
}
