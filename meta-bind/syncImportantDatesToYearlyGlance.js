#!/usr/bin/env node

const IMPORTANT_DATES_VAULT_PATH = "个人整理/重要日期.md";
const YEARLY_GLANCE_DATA_VAULT_PATH = ".obsidian/plugins/yearly-glance/data.json";
const SYNC_SOURCE = "important-dates-sync";
const SYNC_REMARK = "Synced from 个人整理/重要日期.md";
const EVENT_META = {
  birthday: {
    target: "birthdays",
    idPrefix: "birth",
    emoji: "🎂",
    color: "#fa8c16",
  },
  holiday: {
    target: "holidays",
    idPrefix: "holi",
    emoji: "🎉",
    color: "#ff7875",
  },
};

function parseImportantDates(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      return (
        line.startsWith("|") &&
        !line.startsWith("|--") &&
        !/^\|\s*date\s*\|/i.test(line)
      );
    })
    .map((line) => {
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean);
      return {
        date: cells[0],
        label: cells[1],
        type: cells[2],
      };
    })
    .filter((row) => row.date && row.label && row.type);
}

function isSyncedEntry(event) {
  return event?.eventSource === SYNC_SOURCE || event?.remark === SYNC_REMARK;
}

function idFor(type, date, label) {
  const meta = EVENT_META[type];
  const normalizedDate = date.replace("-", "");
  const hash = stableHash(`${type}|${date}|${label}`);
  return `${meta.idPrefix}-important-dates-${normalizedDate}-${hash}`;
}

function stableHash(value) {
  if (typeof require !== "undefined") {
    try {
      return require("crypto").createHash("sha1").update(value).digest("hex").slice(0, 10);
    } catch {
      // Fall through to a small deterministic hash for Obsidian environments without Node crypto.
    }
  }

  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 10);
}

function eventFor(row, year) {
  const meta = EVENT_META[row.type];
  const isoDate = row.date;
  const datedIso = `${year}-${isoDate}`;

  return {
    id: idFor(row.type, row.date, row.label),
    text: row.label,
    eventDate: {
      isoDate,
      calendar: "GREGORIAN",
      userInput: {
        input: isoDate,
        calendar: "GREGORIAN",
      },
    },
    emoji: meta.emoji,
    color: meta.color,
    isRepeat: true,
    remark: SYNC_REMARK,
    eventSource: SYNC_SOURCE,
    dateArr: [datedIso],
  };
}

function validateRow(row) {
  if (!/^\d{2}-\d{2}$/.test(row.date)) {
    return `Invalid date '${row.date}' for '${row.label}'; expected MM-DD`;
  }
  if (!EVENT_META[row.type]) {
    return `Skipped '${row.label}' (${row.date}); unsupported type '${row.type}'`;
  }
  return null;
}

function mergeEvents(existing, generated) {
  const preserved = existing.filter((event) => !isSyncedEntry(event));
  const preservedKeys = new Set(
    preserved.map((event) => {
      const input = event?.eventDate?.userInput?.input ?? event?.eventDate?.isoDate ?? "";
      return `${input}|${event?.text ?? ""}`.toLowerCase();
    }),
  );
  const additions = generated.filter((event) => {
    const key = `${event.eventDate.userInput.input}|${event.text}`.toLowerCase();
    return !preservedKeys.has(key);
  });
  return [...preserved, ...additions].sort((a, b) => {
    const aDate = a?.eventDate?.userInput?.input ?? a?.eventDate?.isoDate ?? "";
    const bDate = b?.eventDate?.userInput?.input ?? b?.eventDate?.isoDate ?? "";
    return aDate.localeCompare(bDate) || String(a.text).localeCompare(String(b.text));
  });
}

async function syncImportantDates({ readText, writeText, notice } = {}) {
  const importantDates = await readText(IMPORTANT_DATES_VAULT_PATH);
  const settings = JSON.parse(await readText(YEARLY_GLANCE_DATA_VAULT_PATH));
  const year = settings?.config?.year ?? new Date().getFullYear();
  const rows = parseImportantDates(importantDates);
  const warnings = [];
  const generated = {
    birthdays: [],
    holidays: [],
  };

  for (const row of rows) {
    const warning = validateRow(row);
    if (warning) {
      warnings.push(warning);
      continue;
    }
    generated[EVENT_META[row.type].target].push(eventFor(row, year));
  }

  settings.data ||= {};
  settings.data.birthdays = mergeEvents(settings.data.birthdays ?? [], generated.birthdays);
  settings.data.holidays = mergeEvents(settings.data.holidays ?? [], generated.holidays);

  await writeText(YEARLY_GLANCE_DATA_VAULT_PATH, `${JSON.stringify(settings, null, 2)}\n`);

  const message = `Synced ${generated.birthdays.length} birthdays and ${generated.holidays.length} holidays to Yearly Glance.`;
  notice?.(message);
  console.log(message);
  for (const warning of warnings) {
    notice?.(warning);
    console.warn(warning);
  }

  return { birthdays: generated.birthdays.length, holidays: generated.holidays.length, warnings };
}

async function runQuickAdd(params) {
  const { app, obsidian } = params;
  const adapter = app.vault.adapter;
  return syncImportantDates({
    readText: (vaultPath) => adapter.read(vaultPath),
    writeText: (vaultPath, content) => adapter.write(vaultPath, content),
    notice: (message) => {
      const Notice = obsidian?.Notice ?? globalThis.Notice;
      if (Notice) new Notice(message);
    },
  });
}

async function runNode() {
  const fs = require("fs");
  const path = require("path");
  const vaultRoot = path.resolve(__dirname, "..", "..");
  return syncImportantDates({
    readText: (vaultPath) => fs.promises.readFile(path.join(vaultRoot, vaultPath), "utf8"),
    writeText: (vaultPath, content) => fs.promises.writeFile(path.join(vaultRoot, vaultPath), content),
  });
}

if (typeof module !== "undefined") {
  module.exports = runQuickAdd;
}

if (
  typeof require !== "undefined" &&
  typeof module !== "undefined" &&
  require.main === module
) {
  runNode().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
