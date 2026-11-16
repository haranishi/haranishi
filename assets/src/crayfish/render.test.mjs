import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeCalendar } from "./calendar.mjs";
import { renderSvg } from "./render.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/calendar.json", import.meta.url), "utf8"),
);
const calendar = normalizeCalendar(fixture);

// Spec path, written here rather than imported, so the renderer is checked
// against the geometry and not against its own helper.
function arrivalDistance(columns, column, row) {
  const pitch = 16;
  const xOf = (col) => 32 + col * pitch + 6;
  const yOf = (index) => 16 + index * pitch + 6;
  const width = 64 + columns * pitch - 4;
  const points = [[-24, yOf(0)], [xOf(columns - 1), yOf(0)]];
  for (let index = 0; index < 6; index += 1) {
    const edge = index % 2 === 0 ? xOf(columns - 1) : xOf(0);
    const far = index % 2 === 0 ? xOf(0) : xOf(columns - 1);
    points.push([edge, yOf(index + 1)]);
    points.push([far, yOf(index + 1)]);
  }
  points.push([width + 24, yOf(6)]);

  const targetX = xOf(column);
  const targetY = yOf(row);
  let travelled = 0;
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const seg = Math.hypot(dx, dy);
    const withinX = dx === 0
      ? targetX === x0
      : targetX >= Math.min(x0, x1) && targetX <= Math.max(x0, x1);
    const withinY = dy === 0
      ? targetY === y0
      : targetY >= Math.min(y0, y1) && targetY <= Math.max(y0, y1);
    if (withinX && withinY && (dx === 0 || dy === 0)) {
      const along = dx === 0 ? Math.abs(targetY - y0) : Math.abs(targetX - x0);
      if (along <= seg + 1e-6) return travelled + along;
    }
    travelled += seg;
  }
  throw new Error(`cell ${column},${row} is not on the path`);
}

function eatenCells(weeks) {
  const cells = [];
  for (let column = 0; column < weeks.length; column += 1) {
    for (let row = 0; row < 7; row += 1) {
      const day = weeks[column][row];
      if (day && day.level >= 1) cells.push({ column, row });
    }
  }
  return cells;
}

function serpentine(weeks) {
  const order = [];
  for (let row = 0; row < 7; row += 1) {
    const columns = [...weeks.keys()];
    if (row % 2 === 1) columns.reverse();
    for (const column of columns) {
      const day = weeks[column][row];
      if (day && day.level >= 1) order.push({ column, row });
    }
  }
  return order;
}

function keyframeBlock(svg, name) {
  const marker = `@keyframes ${name} {`;
  const start = svg.indexOf(marker);
  assert.ok(start >= 0, `missing @keyframes ${name}`);
  const end = svg.indexOf("\n}", start);
  assert.ok(end > start, `unclosed @keyframes ${name}`);
  return svg.slice(start, end);
}

function eatStartPercent(svg, column, row) {
  const body = keyframeBlock(svg, `eat-${column}-${row}`);
  const stops = [...body.matchAll(/([\d.]+)% \{ opacity: ([01]);? \}/g)].map((match) => ({
    percent: Number(match[1]),
    opacity: Number(match[2]),
  }));
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (stops[i].opacity === 1 && stops[i + 1].opacity === 0) return stops[i].percent;
  }
  throw new Error(`eat-${column}-${row} has no fade`);
}

function rectsAt(svg, x, y) {
  const pattern = new RegExp(
    `<rect (?:id="c-\\d+-\\d+" )?x="${x}" y="${y}" width="12" height="12" rx="2"`,
    "g",
  );
  return [...svg.matchAll(pattern)].length;
}

test("normalizeCalendar aligns the fixture's partial weeks", () => {
  assert.equal(calendar.weeks.length, 53);
  assert.deepEqual(
    calendar.weeks[0].map((day) => day?.date ?? null),
    [null, null, null, "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06"],
  );
  assert.equal(calendar.weeks[0][3].level >= 0, true);
  assert.deepEqual(
    calendar.weeks[52].map((day) => day?.date ?? null),
    ["2024-12-29", "2024-12-30", null, null, null, null, null],
  );
  for (const index of [10, 27, 44]) {
    assert.equal(calendar.weeks[index].every((day) => day && day.level === 0 && day.count === 0), true);
  }
  const levels = new Set(calendar.weeks.flat().filter(Boolean).map((day) => day.level));
  assert.deepEqual([...levels].sort((a, b) => a - b), [0, 1, 2, 3, 4]);
});

test("renderSvg is deterministic", () => {
  const lightA = renderSvg(calendar, { theme: "light" });
  const lightB = renderSvg(calendar, { theme: "light" });
  const darkA = renderSvg(calendar, { theme: "dark" });
  const darkB = renderSvg(calendar, { theme: "dark" });
  assert.equal(lightA, lightB);
  assert.equal(darkA, darkB);
  assert.notEqual(lightA, darkA);
});

test("each eaten cell fades at its own arrival time", () => {
  const svg = renderSvg(calendar, { theme: "light" });
  const cells = eatenCells(calendar.weeks);
  const names = [...svg.matchAll(/@keyframes (eat-\d+-\d+) \{/g)].map((match) => match[1]);
  assert.equal(names.length, cells.length);
  assert.equal(new Set(names).size, names.length);

  const columns = calendar.weeks.length;
  const length = arrivalDistance(columns, columns - 1, 6) + ((64 + columns * 16 - 4) + 24 - (32 + (columns - 1) * 16 + 6));
  const duration = length / 220 + 1.5;
  for (const { column, row } of cells) {
    const expected = (arrivalDistance(columns, column, row) / 220 / duration) * 100;
    const actual = eatStartPercent(svg, column, row);
    assert.ok(
      Math.abs(actual - expected) <= 0.05,
      `eat-${column}-${row} ${actual} vs ${expected}`,
    );
  }
});

test("eat times increase along the serpentine", () => {
  const svg = renderSvg(calendar, { theme: "dark" });
  const times = serpentine(calendar.weeks).map(({ column, row }) => eatStartPercent(svg, column, row));
  for (let i = 1; i < times.length; i += 1) {
    assert.ok(times[i] > times[i - 1], `index ${i}: ${times[i]} <= ${times[i - 1]}`);
  }
});

test("svg stays self-contained and small", () => {
  for (const theme of ["light", "dark"]) {
    for (const weeks of [undefined, 18]) {
      const svg = renderSvg(calendar, { theme, weeks });
      assert.equal(svg.includes("<script"), false);
      assert.equal(svg.toLowerCase().includes("<foreignobject"), false);
      assert.equal(svg.toLowerCase().includes("href"), false);
      assert.equal(svg.includes("@import"), false);
      assert.equal(svg.includes("<image"), false);
      assert.equal(svg.includes("data:image"), false);
      const withoutXmlns = svg.replaceAll("http://www.w3.org/2000/svg", "");
      assert.equal(/https?:/i.test(withoutXmlns), false);
      assert.match(svg, /@media \(prefers-reduced-motion: reduce\) \{ \* \{ animation: none !important \} \}/);
      assert.ok(Buffer.byteLength(svg) <= 300 * 1024);
      for (const match of svg.matchAll(/-?\d+\.\d+/g)) {
        assert.ok(match[0].split(".")[1].length <= 3, match[0]);
      }
    }
  }
});

test("18-week svg keeps only the latest weeks", () => {
  const svg = renderSvg(calendar, { theme: "light", weeks: 18 });
  const drawn = calendar.weeks.slice(-18);
  assert.match(svg, /width="348"/);
  assert.match(svg, /height="140"/);
  assert.match(svg, /viewBox="0 0 348 140"/);

  let expected = 0;
  for (let column = 0; column < drawn.length; column += 1) {
    for (let row = 0; row < 7; row += 1) {
      const day = drawn[column][row];
      const count = rectsAt(svg, 32 + column * 16, 16 + row * 16);
      if (!day) {
        assert.equal(count, 0, `unexpected rect ${column},${row}`);
      } else if (day.level >= 1) {
        assert.equal(count, 2, `top missing ${column},${row}`);
        expected += 2;
      } else {
        assert.equal(count, 1, `base missing ${column},${row}`);
        expected += 1;
      }
    }
  }
  assert.equal([...svg.matchAll(/<rect /g)].length, expected);
  assert.ok(rectsAt(svg, 32, 16) >= 1);
  assert.equal(rectsAt(renderSvg(calendar, { theme: "light" }), 32, 16), 0);
});

test("resting pose and the first step match the spec", () => {
  const svg = renderSvg(calendar, { theme: "light" });
  assert.match(svg, /class="walker" transform="translate\(14 70\)"/);
  const walk = keyframeBlock(svg, "walk");
  assert.match(walk, /0\.000% \{ transform: translate\(-24px, 22px\) rotate\(0deg\); \}/);
  assert.match(walk, /translate\(932px, 118px\) rotate\(0deg\)/);
});

function rectTags(svg) {
  return [...svg.matchAll(/<rect [^/]*\/>/g)].map((match) => match[0]);
}

test("still output keeps the grid and drops motion", () => {
  // Same call as before this option existed.
  const animated = renderSvg(calendar, { theme: "light" });
  assert.equal(animated, renderSvg(calendar, { theme: "light" }));
  assert.match(animated, /@keyframes /);
  assert.match(animated, /animation:/);
  assert.match(animated, /class="walker" transform="translate\(14 70\)"/);

  for (const theme of ["light", "dark"]) {
    const moving = renderSvg(calendar, { theme });
    const still = renderSvg(calendar, { theme, still: true });
    assert.equal(still, renderSvg(calendar, { theme, still: true }));
    assert.equal(still.includes("@keyframes"), false);
    assert.equal(still.includes("animation"), false);
    assert.equal(still.match(/width="(\d+)"/)[1], moving.match(/width="(\d+)"/)[1]);
    assert.equal(still.match(/height="(\d+)"/)[1], moving.match(/height="(\d+)"/)[1]);
    assert.deepEqual(rectTags(still), rectTags(moving));
    assert.match(still, /<g transform="translate\(14 70\)">/);
    const classes = [...still.matchAll(/class="([^"]*)"/g)].map((match) => match[1]);
    assert.deepEqual(classes, ["crayfish"]);
  }
});
