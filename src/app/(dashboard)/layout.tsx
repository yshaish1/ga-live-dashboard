"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { TVModeProvider, useTVMode } from "@/lib/tv-mode-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <TVModeProvider>
      <DashboardShell>{children}</DashboardShell>
    </TVModeProvider>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isTVMode } = useTVMode();

  return (
    <div className="flex h-screen overflow-hidden">
      {!isTVMode && <Sidebar />}
      <main className={`flex-1 overflow-y-auto ${isTVMode ? "" : "pb-16 md:pb-0"}`}>
        {children}
      </main>
    </div>
  );
}
