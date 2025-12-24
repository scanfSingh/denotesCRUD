"use client";

import { useTheme } from "./ThemeProvider";
import { useState, useRef, useEffect } from "react";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const themes = [
    { value: "light" as const, label: "Light", icon: "☀️" },
    { value: "dark" as const, label: "Dark", icon: "🌙" },
    { value: "mono" as const, label: "B&W", icon: "◐" },
    { value: "system" as const, label: "System", icon: "💻" },
  ];

  const getIcon = () => {
    if (theme === "system") return "💻";
    if (theme === "mono") return "◐";
    return resolvedTheme === "dark" ? "🌙" : "☀️";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-800 mono:hover:bg-gray-200 transition-all duration-200"
        aria-label="Toggle theme"
      >
        <span className="text-lg">{getIcon()}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 mono:bg-white rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 mono:border-black overflow-hidden z-50">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setTheme(t.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
                theme === t.value
                  ? "bg-indigo-50 dark:bg-indigo-900/30 mono:bg-gray-200 text-indigo-600 dark:text-indigo-400 mono:text-black mono:font-bold"
                  : "text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-50 dark:hover:bg-gray-700 mono:hover:bg-gray-100"
              }`}
            >
              <span>{t.icon}</span>
              <span className="font-medium">{t.label}</span>
              {theme === t.value && (
                <span className="ml-auto text-indigo-600 dark:text-indigo-400 mono:text-black">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
