let audioContext: AudioContext | null = null;

type LoopHandle = {
  intervalId: number;
  active: boolean;
};

const loops: Record<"offline" | "vpn", LoopHandle | null> = {
  offline: null,
  vpn: null,
};

function getContext() {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export async function unlockNocSounds() {
  const ctx = getContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  return ctx.state === "running";
}

function playTone(
  frequency: number,
  startAt: number,
  duration: number,
  volume = 0.22,
  type: OscillatorType = "square",
) {
  const ctx = getContext();
  if (!ctx || ctx.state !== "running") return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

function playOfflinePattern() {
  const ctx = getContext();
  if (!ctx || ctx.state !== "running") return;

  const t = ctx.currentTime;
  playTone(392, t, 0.2, 0.26);
  playTone(294, t + 0.28, 0.2, 0.26);
  playTone(196, t + 0.52, 0.45, 0.3, "sawtooth");
}

function playVpnPattern() {
  const ctx = getContext();
  if (!ctx || ctx.state !== "running") return;

  const t = ctx.currentTime;
  playTone(880, t, 0.12, 0.18, "sine");
  playTone(988, t + 0.16, 0.12, 0.18, "sine");
  playTone(740, t + 0.34, 0.24, 0.22, "sine");
}

function stopLoop(kind: "offline" | "vpn") {
  const loop = loops[kind];
  if (!loop) return;

  window.clearInterval(loop.intervalId);
  loops[kind] = null;
}

function startLoop(kind: "offline" | "vpn") {
  if (loops[kind]?.active) return;

  const play = kind === "offline" ? playOfflinePattern : playVpnPattern;
  const intervalMs = kind === "offline" ? 2200 : 2800;

  play();
  const intervalId = window.setInterval(play, intervalMs);
  loops[kind] = { intervalId, active: true };
}

export function stopAllNocAlarms() {
  stopLoop("offline");
  stopLoop("vpn");
}

/** Mantém alarmes contínuos enquanto houver equipamentos com problema. */
export function syncNocAlarms({
  hasOffline,
  hasVpnIssue,
  enabled,
}: {
  hasOffline: boolean;
  hasVpnIssue: boolean;
  enabled: boolean;
}) {
  if (!enabled) {
    stopAllNocAlarms();
    return;
  }

  if (hasOffline) {
    startLoop("offline");
  } else {
    stopLoop("offline");
  }

  if (!hasOffline && hasVpnIssue) {
    startLoop("vpn");
  } else {
    stopLoop("vpn");
  }
}
