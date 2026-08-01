// CSV building for the admin export (docs/BUILD_PLAN.md Phase 5).
// Every field is quoted; the two phone columns are additionally wrapped in
// Excel's ="..." text form — plain quoting is not enough to stop Excel
// eating leading zeros ("0801…") or treating "+234…" as a formula when a
// .csv is opened directly (the acceptance criterion).

export const LEAD_EXPORT_COLUMNS = [
  "name",
  "email",
  "phone",
  "phone_e164",
  "gadget",
  "gadget_other",
  "move",
  "timing",
  "consent",
  "source",
  "voucher_code",
  "expires_at",
  "redeemed_at",
  "created_at",
] as const;

const EXCEL_TEXT_COLUMNS = new Set<string>(["phone", "phone_e164"]);

function quoted(value: unknown): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replaceAll('"', '""')}"`;
}

function excelText(value: unknown): string {
  if (value === null || value === undefined || value === "") return '""';
  const s = String(value).replaceAll('"', '""');
  return `"=""${s}"""`;
}

export function buildLeadsCsv(rows: Record<string, unknown>[]): string {
  const header = LEAD_EXPORT_COLUMNS.map((c) => quoted(c)).join(",");
  const lines = rows.map((row) =>
    LEAD_EXPORT_COLUMNS.map((col) =>
      EXCEL_TEXT_COLUMNS.has(col) ? excelText(row[col]) : quoted(row[col]),
    ).join(","),
  );
  return [header, ...lines].join("\r\n") + "\r\n";
}
