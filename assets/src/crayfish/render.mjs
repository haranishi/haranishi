import { crayfishMarkup } from "./art.mjs";

const CELL = 12;
const PITCH = 16;
const PAD_X = 32;
const PAD_Y = 16;
const RADIUS = 2;
const SPEED = 220;
const REGROW = 1.5;
const EAT_FADE = 0.12;

const COLOURS = {
  light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  dark: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
};

function num(value) {
  const rounded = Math.round(value * 1000) / 1000;
  if (Object.is(rounded, -0)) return "0";
  return String(rounded);
}

function pct(value) {
  return (Math.round(value * 1000) / 1000).toFixed(3);
}

function cellCentre(column, row) {
  return {
    x: PAD_X + column * PITCH + CELL / 2,
    y: PAD_Y + row * PITCH + CELL / 2,
  };
}

function dimensions(columns) {
  return {
    width: 2 * PAD_X + columns * PITCH - 4,
    height: 2 * PAD_Y + 7 * PITCH - 4,
  };
}

// Distance along the serpentine path to a cell centre. The path still
// crosses empty slots; only the arrival distance is needed here.
function eatDistance(columns, column, row) {
  const left = cellCentre(0, 0).x;
  const right = cellCentre(columns - 1, 0).x;
  const span = right - left;
  const entry = right + 24;
  const x = cellCentre(column, row).x;
  if (row === 0) return x + 24;
  let atRow = entry + PITCH;
  for (let i = 1; i < row; i += 1) atRow += span + PITCH;
  if (row % 2 === 1) return atRow + (right - x);
  return atRow + (x - left);
}

function pathLength(columns) {
  const { width } = dimensions(columns);
  const left = cellCentre(0, 0).x;
  const right = cellCentre(columns - 1, 0).x;
  const entry = right + 24;
  const span = right - left;
  const exit = width + 24 - right;
  return entry + 6 * span + 6 * PITCH + exit;
}

// Vertices only. Heading flips inside each 16px down-step, passing through
// 90° so the interpolation cannot take the long way around a 180° turn.
function pathVertices(columns) {
  const { width } = dimensions(columns);
  const left = cellCentre(0, 0).x;
  const right = cellCentre(columns - 1, 0).x;
  const points = [];
  const add = (x, y, heading) => {
    const previous = points[points.length - 1];
    const step = previous ? Math.hypot(x - previous.x, y - previous.y) : 0;
    points.push({
      x,
      y,
      heading,
      cum: previous ? previous.cum + step : 0,
    });
  };

  add(-24, cellCentre(0, 0).y, 0);
  add(right, cellCentre(0, 0).y, 0);
  for (let row = 0; row < 6; row += 1) {
    const fromRight = row % 2 === 0;
    const edge = fromRight ? right : left;
    const nextHeading = fromRight ? 180 : 0;
    const y0 = cellCentre(0, row).y;
    const y1 = cellCentre(0, row + 1).y;
    add(edge, (y0 + y1) / 2, 90);
    add(edge, y1, nextHeading);
    add(fromRight ? left : right, y1, nextHeading);
  }
  add(width + 24, cellCentre(0, 6).y, 0);
  return points;
}

function pose(point) {
  return `translate(${num(point.x)}px, ${num(point.y)}px) rotate(${num(point.heading)}deg)`;
}

function walkCss(columns, duration) {
  const length = pathLength(columns);
  const frames = pathVertices(columns).map((point) => {
    const at = (point.cum / SPEED / duration) * 100;
    return `  ${pct(at)}% { transform: ${pose(point)}; }`;
  });
  const last = pathVertices(columns).at(-1);
  // Hold off-canvas while the squares regrow, then the loop restarts.
  frames.push(`  100.000% { transform: ${pose(last)}; }`);
  return `@keyframes walk {\n${frames.join("\n")}\n}`;
}

function eatCss(columns, column, row, duration) {
  const length = pathLength(columns);
  const move = length / SPEED;
  const tEat = eatDistance(columns, column, row) / SPEED;
  const stops = [
    [0, 1],
    [(tEat / duration) * 100, 1],
    [((tEat + EAT_FADE) / duration) * 100, 0],
    [(move / duration) * 100, 0],
    [100, 1],
  ];
  let previous = -1;
  const lines = stops.map(([percent, opacity]) => {
    let value = Math.round(percent * 1000) / 1000;
    if (value <= previous) value = Math.round((previous + 0.001) * 1000) / 1000;
    previous = value;
    return `  ${value.toFixed(3)}% { opacity: ${opacity}; }`;
  });
  return `@keyframes eat-${column}-${row} {\n${lines.join("\n")}\n}`;
}

// Limb classes exist only so CSS can move them. A still file has no
// stylesheet, and <img> may not pass prefers-reduced-motion into an SVG.
const MOTION_CLASSES = new Set(["hinge", "leg-l", "leg-r", "finger", "ant-a", "ant-b"]);

function motionlessMarkup(theme) {
  return crayfishMarkup(theme).replace(/ class="([^"]*)"/g, (_, names) => {
    const kept = names.split(/\s+/).filter((name) => name && !MOTION_CLASSES.has(name));
    return kept.length ? ` class="${kept.join(" ")}"` : "";
  });
}

function stillSvg(width, height, base, tops, theme) {
  const restY = cellCentre(0, 3).y;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t">
<title id="t">A crayfish walks across a GitHub contribution graph and eats the green squares</title>
${base.join("")}
${tops.join("")}
<g transform="translate(14 ${num(restY)})">${motionlessMarkup(theme)}</g>
</svg>
`;
}

function lifeCss() {
  // transform-box: fill-box makes 0 0 the limb's own bounding-box corner.
  // Limbs are drawn from that corner toward +x so the joint stays put.
  return `.hinge { transform-box: fill-box; transform-origin: 0 0; }
.leg-l { animation: wiggle 0.36s linear infinite; }
.leg-r { animation: wiggle 0.36s linear infinite; animation-delay: -0.18s; }
.finger { animation: pinch 0.5s ease-in-out infinite; }
.ant-a { animation: sway 1.2s ease-in-out infinite; }
.ant-b { animation: sway 1.2s ease-in-out infinite; animation-delay: -0.6s; }
@keyframes wiggle {
  0%, 100% { transform: rotate(-14deg); }
  50% { transform: rotate(14deg); }
}
@keyframes pinch {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(24deg); }
}
@keyframes sway {
  0%, 100% { transform: rotate(-7deg); }
  50% { transform: rotate(7deg); }
}`;
}

export function renderSvg(calendar, options = {}) {
  const theme = options.theme ?? "light";
  const palette = COLOURS[theme];
  if (!palette) throw new Error(`Unknown theme: ${theme}`);
  const allWeeks = calendar?.weeks;
  if (!Array.isArray(allWeeks)) throw new Error("renderSvg: calendar.weeks is missing");

  const count = options.weeks == null ? allWeeks.length : options.weeks;
  const weeks = allWeeks.slice(-count);
  const columns = weeks.length;
  const { width, height } = dimensions(columns);
  const duration = pathLength(columns) / SPEED + REGROW;
  const durationText = (Math.round(duration * 1000) / 1000).toFixed(3);

  const base = [];
  const tops = [];
  const eatRules = [];
  const eatFrames = [];

  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < 7; row += 1) {
      const day = weeks[column][row];
      if (!day) continue;
      const x = PAD_X + column * PITCH;
      const y = PAD_Y + row * PITCH;
      const box = `x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="${RADIUS}"`;
      base.push(`<rect ${box} fill="${palette[0]}"/>`);
      if (day.level >= 1) {
        const id = `c-${column}-${row}`;
        tops.push(`<rect id="${id}" ${box} fill="${palette[day.level]}"/>`);
        if (!options.still) {
          eatRules.push(`#${id} { animation: eat-${column}-${row} ${durationText}s linear infinite; }`);
          eatFrames.push(eatCss(columns, column, row, duration));
        }
      }
    }
  }

  // Parked in the left padding. rsvg ignores CSS, so this attribute is the
  // resting pose; the walk animation overrides it in a browser.
  const restY = cellCentre(0, 3).y;
  if (options.still) return stillSvg(width, height, base, tops, theme);
  const style = `${lifeCss()}
.walker { animation: walk ${durationText}s linear infinite; transform-box: view-box; transform-origin: 0 0; }
${walkCss(columns, duration)}
${eatRules.join("\n")}
${eatFrames.join("\n")}
@media (prefers-reduced-motion: reduce) { * { animation: none !important } }`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t">
<title id="t">A crayfish walks across a GitHub contribution graph and eats the green squares</title>
<style><![CDATA[
${style}
]]></style>
${base.join("")}
${tops.join("")}
<g class="walker" transform="translate(14 ${num(restY)})">${crayfishMarkup(theme)}</g>
</svg>
`;
}
