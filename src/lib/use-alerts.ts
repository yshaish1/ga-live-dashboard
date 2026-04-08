"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  getAlerts,
  addAlert as fbAddAlert,
  updateAlert as fbUpdateAlert,
  deleteAlert as fbDeleteAlert,
  type AlertConfig,
} from "./firestore";
import type { RealtimeData } from "./ga-api";

export function useAlerts(userId: string | undefined, data: RealtimeData) {
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [loaded, setLoaded] = useState(false);
  const firedRef = useRef<Set<string>>(new Set());

  // Load alerts from Firestore
  useEffect(() => {
    if (!userId) return;
    getAlerts(userId).then((a) => {
      setAlerts(a);
      setLoaded(true);
    });
  }, [userId]);

  // Check thresholds
  useEffect(() => {
    if (!loaded || alerts.length === 0) return;

    for (const alert of alerts) {
      if (!alert.enabled || !alert.id) continue;

      const value = data[alert.metricKey] as number;
      const breached =
        alert.condition === "above"
          ? value > alert.threshold
          : value < alert.threshold;

      if (breached && !firedRef.current.has(alert.id)) {
        firedRef.current.add(alert.id);
        fireNotification(alert, value);
      } else if (!breached && firedRef.current.has(alert.id)) {
        firedRef.current.delete(alert.id);
      }
    }
  }, [data, alerts, loaded]);

  const addAlert = useCallback(
    async (config: Omit<AlertConfig, "id" | "userId" | "createdAt">) => {
      if (!userId) return;
      const id = await fbAddAlert({
        ...config,
        userId,
        createdAt: Date.now(),
      });
      setAlerts((prev) => [...prev, { ...config, id, userId, createdAt: Date.now() }]);
    },
    [userId]
  );

  const toggleAlert = useCallback(async (id: string, enabled: boolean) => {
    await fbUpdateAlert(id, { enabled });
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
  }, []);

  const removeAlert = useCallback(async (id: string) => {
    await fbDeleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    firedRef.current.delete(id);
  }, []);

  return { alerts, addAlert, toggleAlert, removeAlert };
}

function fireNotification(alert: AlertConfig, currentValue: number) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const label = alert.metricKey === "activeUsers"
    ? "Active Users"
    : alert.metricKey === "pageviews"
    ? "Pageviews"
    : "Events";

  new Notification("GA Dashboard Alert", {
    body: `${label} is ${alert.condition} ${alert.threshold} (currently ${currentValue})`,
    icon: "/favicon.ico",
  });
}
