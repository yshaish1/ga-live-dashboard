"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Radio, Settings, Sun, Moon, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { href: "/streams", icon: Radio, label: "Streams" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col items-center justify-between w-16 border-r border-border bg-bg-sidebar py-4 shrink-0">
        <div className="flex flex-col items-center gap-1">
          <Link
            href="/dashboard"
            className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400"
          >
            <BarChart3 className="h-5 w-5 text-white" />
          </Link>

          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                  active
                    ? "bg-accent-light text-accent"
                    : "text-text-muted hover:bg-accent-light hover:text-text-primary"
                }`}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-text-muted hover:bg-accent-light hover:text-text-primary transition-colors"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {user?.photoURL && (
            <button
              onClick={signOut}
              title="Sign out"
              className="h-8 w-8 overflow-hidden rounded-full ring-2 ring-border"
            >
              <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t border-border bg-bg-sidebar px-2 py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] transition-colors ${
                active ? "text-accent" : "text-text-muted"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
