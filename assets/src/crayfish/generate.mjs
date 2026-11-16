import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { fetchCalendar, normalizeCalendar } from "./calendar.mjs";
import { renderSvg } from "./render.mjs";

function usage() {
  return "Usage: node assets/src/crayfish/generate.mjs (--user <login> | --input <file>) --out <dir>";
}

export async function generate(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      user: { type: "string" },
      input: { type: "string" },
      out: { type: "string" },
    },
    strict: true,
  });

  if (!values.out) throw new Error(`--out is required\n${usage()}`);
  if (Boolean(values.user) === Boolean(values.input)) {
    throw new Error(`Pass exactly one of --user or --input\n${usage()}`);
  }

  let raw;
  if (values.input) {
    raw = JSON.parse(await readFile(values.input, "utf8"));
  } else {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("GITHUB_TOKEN is required with --user");
    raw = await fetchCalendar(values.user, token);
  }

  const calendar = normalizeCalendar(raw);
  await mkdir(values.out, { recursive: true });

  const files = [
    ["crayfish-light.svg", "light", undefined],
    ["crayfish-dark.svg", "dark", undefined],
    ["crayfish-light-sm.svg", "light", 18],
    ["crayfish-dark-sm.svg", "dark", 18],
    ["crayfish-light-still.svg", "light", undefined, true],
    ["crayfish-dark-still.svg", "dark", undefined, true],
  ];
  for (const [name, theme, weeks, still] of files) {
    const options = { theme, weeks };
    if (still) options.still = true;
    const svg = renderSvg(calendar, options);
    await writeFile(path.join(values.out, name), svg);
  }
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  generate(process.argv.slice(2)).catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
