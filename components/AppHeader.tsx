"use client";

import type { ReactNode } from "react";

type NavKey = "dashboard" | "workouts" | "nutrition" | "progress";

const NAV_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: "dashboard", label: "Dashboard", href: "/workout-plan" },
  { key: "workouts", label: "Workouts", href: "/workout" },
  { key: "nutrition", label: "Nutrition", href: "/nutrition" },
  { key: "progress", label: "Progress", href: "/progress" },
];

interface AppHeaderProps {
  active: NavKey;
  /** Right-aligned slot for page-specific controls (e.g. a "Back to Dashboard" button or Login). */
  rightSlot?: ReactNode;
}

export default function AppHeader({ active, rightSlot }: AppHeaderProps) {
  return (
    <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <img src="/logo.png" alt="Root Fitness Logo" className="w-10 h-10 mr-3 object-contain" />
            <span className="text-white text-xl font-bold">Root Fitness</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  item.key === active
                    ? "text-white bg-gradient-to-r from-teal-500 to-blue-600 shadow-md shadow-teal-500/20"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center">{rightSlot}</div>
        </div>
      </div>
    </header>
  );
}
