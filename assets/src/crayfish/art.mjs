// Drawn around (0, 0), head toward +x. The walker rotates that origin,
// so the body — not a corner of the svg — is the pivot.

const THEMES = {
  light: {
    body: "#c2410c",
    outline: "#7c2d12",
    highlight: "#f97316",
    eye: "#1c1917",
    catch: "#fff7ed",
  },
  dark: {
    body: "#ea580c",
    outline: "#9a3412",
    highlight: "#fb923c",
    eye: "#1c1917",
    catch: "#fff7ed",
  },
};

function num(value) {
  const rounded = Math.round(value * 1000) / 1000;
  if (Object.is(rounded, -0)) return "0";
  return String(rounded);
}

function legPath(length) {
  return `M0 0 C${num(length * 0.42)} 0.22 ${num(length * 0.74)} 0.4 ${num(length)} 0.14`;
}

// Canonical limbs sit on the upper side (negative y). scale(1 -1) mirrors them.
function legs(palette, phase) {
  const specs = [
    [4.7, -3.65, -108, 5.15],
    [1.55, -4.0, -122, 5.25],
    [-1.25, -3.7, -136, 4.75],
    [-3.55, -3.05, -152, 4.15],
  ];
  return specs
    .map(([x, y, angle, length]) => {
      const d = legPath(length);
      return `<g transform="translate(${num(x)} ${num(y)}) rotate(${num(angle)})"><g class="hinge ${phase}"><path d="${d}" fill="none" stroke="${palette.outline}" stroke-width="1.7"/><path d="${d}" fill="none" stroke="${palette.body}" stroke-width="0.95"/></g></g>`;
    })
    .join("");
}

function segment(xFront, xBack, halfHeight, spike) {
  const mid = (xFront + xBack) / 2;
  const h = halfHeight;
  return `M${num(xFront)} ${num(-(h - 0.28))} L${num(mid + 0.2)} ${num(-h)} L${num(mid - 0.05)} ${num(-(h + spike))} L${num(xBack + 0.25)} ${num(-(h - 0.18))} L${num(xBack)} ${num(-h * 0.28)} L${num(xBack)} ${num(h * 0.28)} L${num(xBack + 0.25)} ${num(h - 0.18)} L${num(mid - 0.05)} ${num(h + spike)} L${num(mid + 0.2)} ${num(h)} L${num(xFront)} ${num(h - 0.28)}Z`;
}

function tailFan() {
  // Five lobes. The telson stays right of x=-12.7 so a 1px stroke, parked at x=14, clears the viewBox edge.
  return [
    "M-7.75-1.5 C-9.55-3.45-11.75-3.8-12.25-2.5 C-11.25-1.4-9.45-1.15-7.75-0.85Z",
    "M-7.6-0.85 C-9.65-1.65-11.85-1.4-12.3-0.42 C-11.05-0.12-9.25-0.12-7.6-0.08Z",
    "M-7.45-1 C-9.85-1.2-12.45-0.5-12.7 0 C-12.45 0.5-9.85 1.2-7.45 1Z",
    "M-7.6 0.08 C-9.25 0.12-11.05 0.12-12.3 0.42 C-11.85 1.4-9.65 1.65-7.6 0.85Z",
    "M-7.75 0.85 C-9.45 1.15-11.25 1.4-12.25 2.5 C-11.75 3.8-9.55 3.45-7.75 1.5Z",
  ]
    .map((d) => `<path d="${d}"/>`)
    .join("");
}

function abdomen() {
  const segments = [
    [-6.55, -9.0, 1.42, 0.55],
    [-4.0, -6.7, 1.92, 0.7],
    [-1.55, -4.2, 2.42, 0.82],
    [0.95, -1.75, 2.95, 0.95],
  ];
  return segments
    .map(([front, back, height, spike]) => `<path d="${segment(front, back, height, spike)}"/>`)
    .join("");
}

function carapace(palette) {
  return [
    `<path d="M-3.45 0 C-3.45-2.55-1.15-4.2 2.45-4.4 C5.35-4.55 7.7-3.35 8.35-1.6 L11.2 0 L8.35 1.6 C7.7 3.35 5.35 4.55 2.45 4.4 C-1.15 4.2-3.45 2.55-3.45 0Z"/>`,
    `<path d="M-0.15-2.4 C1.9-3.4 4.7-3.3 6.5-2.15 C4.45-1.3 1.85-1.2 0.05-1.85Z" fill="${palette.highlight}" stroke="none"/>`,
    `<path d="M0.35-3.2 C2.05-1.15 2.05 1.15 0.35 3.2" fill="none" opacity="0.85"/>`,
  ].join("");
}

function claw(palette, fingerClass) {
  // The palm stops before the tips, so the fixed finger and the dactyl
  // read as two pincers with background between them. The dactyl triangle
  // starts at (0,0); positive rotation swings that tip open.
  const finger = "M0 0 L3.55 0.4 L0 1.05Z";
  return [
    `<path d="M3.55-2.15 C5.05-3.35 6.55-4.45 7.9-5.05 C7.35-4.25 5.85-3.15 4.6-2.35 C4.1-2.05 3.7-1.95 3.55-2.15Z"/>`,
    `<path d="M7.35-4.55 C7.15-6.85 8.7-8.25 10.55-8.35 L14.15-9.25 L14.5-8.2 L11.25-7.05 C11.7-6.15 11.85-5.15 11.35-4.55 C10.15-4.15 8.4-4.05 7.35-4.55Z"/>`,
    `<g transform="translate(11.2 -4.6) rotate(-22)"><g class="hinge ${fingerClass}"><path d="${finger}" stroke-width="1"/></g></g>`,
    `<ellipse cx="9.7" cy="-6.45" rx="1.25" ry="0.62" fill="${palette.highlight}" stroke="none" transform="rotate(-36 9.7 -6.45)"/>`,
  ].join("");
}

function eye(palette) {
  return [
    `<path d="M6.2-2.2 C7.15-3.15 7.85-3.85 8.35-3.9" fill="none" stroke-width="1.3"/>`,
    `<circle cx="8.85" cy="-4.05" r="1.58" fill="${palette.eye}" stroke-width="1"/>`,
  ].join("");
}

function antenna(palette, phase) {
  // One 1.15px stroke: thinner than the claws, still visible on white and #0d1117.
  const d = "M0 0 C4.2 0.18 8.4 0.55 12.9 0.22";
  return `<g transform="translate(9.3 -1.05) rotate(-11)"><g class="hinge ${phase}"><path d="${d}" fill="none" stroke="${palette.outline}" stroke-width="1.15"/></g></g>`;
}

export function crayfishMarkup(theme) {
  const palette = THEMES[theme];
  if (!palette) throw new Error(`Unknown crayfish theme: ${theme}`);

  // Legs and the lower claw/eye/antenna are mirrored so both sides match.
  // Phase classes stay distinct: left and right legs already alternate.
  return `<g class="crayfish" fill="${palette.body}" stroke="${palette.outline}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${legs(palette, "leg-l")}<g transform="scale(1 -1)">${legs(palette, "leg-r")}</g>${tailFan()}${abdomen()}${carapace(palette)}${claw(palette, "finger")}<g transform="scale(1 -1)">${claw(palette, "finger")}</g>${eye(palette)}<g transform="scale(1 -1)">${eye(palette)}</g><circle cx="9.15" cy="-4.48" r="0.42" fill="${palette.catch}" stroke="none"/><circle cx="9.15" cy="3.62" r="0.42" fill="${palette.catch}" stroke="none"/>${antenna(palette, "ant-a")}<g transform="scale(1 -1)">${antenna(palette, "ant-b")}</g></g>`;
}
