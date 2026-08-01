// Input normalization — enforced in the API layer per docs/DATABASE.md.

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// docs/DATABASE.md: keep the value as entered in `phone`; store the +234
// form in `phone_e164` when the Nigerian mobile pattern is recognizable
// (with or without the country code), else leave phone_e164 null.
export function normalizePhone(raw: string | null | undefined): {
  phone: string | null;
  phoneE164: string | null;
} {
  const entered = raw?.trim() ?? "";
  if (entered === "") {
    return { phone: null, phoneE164: null };
  }
  const digits = entered.replace(/[\s\-().]/g, "");
  if (/^0[789][01]\d{8}$/.test(digits)) {
    return { phone: entered, phoneE164: `+234${digits.slice(1)}` };
  }
  if (/^\+234[789][01]\d{8}$/.test(digits)) {
    return { phone: entered, phoneE164: digits };
  }
  if (/^234[789][01]\d{8}$/.test(digits)) {
    return { phone: entered, phoneE164: `+${digits}` };
  }
  return { phone: entered, phoneE164: null };
}
