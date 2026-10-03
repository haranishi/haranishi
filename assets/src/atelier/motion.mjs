export const DURATION = 12;
export const POSTER_TIME = 8.5;

export function loopTime(time) {
  if (!Number.isFinite(time)) throw new TypeError('time must be finite');
  return ((time % DURATION) + DURATION) % DURATION;
}

// Zero speed at the endpoints: entering and leaving the title hold cannot snap.
export function smoothstep(from, to, value) {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

export function cameraState(time, mobile = false) {
  const t = loopTime(time);
  const travel = smoothstep(0.8, 4.5, t) * (1 - smoothstep(5.1, 8.1, t));
  const sway = Math.sin((t / DURATION) * Math.PI * 2);
  return {
    position: [0.8 + sway * 1.15 - travel * 0.85, 0.6 + Math.sin((t / DURATION) * Math.PI * 2) * 0.28, (mobile ? 16 : 13) - travel * (mobile ? 3.2 : 4.8)],
    target: [0.25 + travel * 0.6, 0.0 + travel * 0.15, -3.4],
    travel,
    phase: t,
  };
}

export function floatState(time, index) {
  const angle = (loopTime(time) / DURATION) * Math.PI * 2;
  return {
    y: Math.sin(angle + index * 1.31) * 0.14,
    roll: Math.sin(angle + index * 0.89) * 0.022,
    yaw: Math.sin(angle + index * 1.07) * 0.035,
  };
}

export function seededRandom(seed = 731) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
