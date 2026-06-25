"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { MonitoringRow } from "@/lib/monitoring/get-monitoring-data";
import {
  stopAllNocAlarms,
  syncNocAlarms,
  unlockNocSounds,
} from "@/lib/monitoring/noc-sounds";

const STORAGE_KEY = "noc-sound-enabled";

export function useNocSoundAlerts(rows: MonitoringRow[], isLoading: boolean) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEY) !== "false";
  });
  const [audioReady, setAudioReady] = useState(false);

  const hasOffline = useMemo(
    () => rows.some((row) => !row.online),
    [rows],
  );

  const hasVpnIssue = useMemo(
    () => rows.some((row) => row.online && !row.vpnConnected),
    [rows],
  );

  const enableSound = useCallback(async () => {
    const unlocked = await unlockNocSounds();
    setAudioReady(unlocked);
    if (unlocked) {
      setSoundEnabled(true);
      localStorage.setItem(STORAGE_KEY, "true");
    }
    return unlocked;
  }, []);

  const toggleSound = useCallback(async () => {
    if (!soundEnabled || !audioReady) {
      await enableSound();
      return;
    }

    setSoundEnabled(false);
    localStorage.setItem(STORAGE_KEY, "false");
    stopAllNocAlarms();
  }, [audioReady, enableSound, soundEnabled]);

  useEffect(() => {
    if (isLoading) return;

    syncNocAlarms({
      hasOffline,
      hasVpnIssue,
      enabled: soundEnabled && audioReady,
    });
  }, [audioReady, hasOffline, hasVpnIssue, isLoading, soundEnabled]);

  useEffect(() => {
    return () => {
      stopAllNocAlarms();
    };
  }, []);

  const soundActive = soundEnabled && audioReady;

  return {
    soundActive,
    soundEnabled,
    audioReady,
    enableSound,
    toggleSound,
  };
}
