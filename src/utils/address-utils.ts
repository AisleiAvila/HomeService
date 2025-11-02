export type AddressInput = any;

function toTitleCase(str: string | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function normalizePostalCode(code?: string | null): string {
  if (!code) return "";
  const onlyDigits = String(code).replace(/[^0-9]/g, "");
  if (onlyDigits.length === 7) {
    return `${onlyDigits.slice(0, 4)}-${onlyDigits.slice(4)}`;
  }
  // If already looks like 1234-567, keep as is
  if (/^\d{4}-\d{3}$/.test(String(code))) {
    return String(code);
  }
  return String(code);
}

export function extractPtAddressParts(src: AddressInput): {
  streetNumber: string;
  postalCode: string;
  locality: string;
  district: string;
} {
  const a: any = src || {};
  const street = a.street ?? a.address?.street ?? "";
  const number = a.number ?? a.address?.number ?? "";
  const zip = a.zip_code ?? a.address?.postal_code ?? "";
  const city = a.city ?? a.address?.locality ?? "";
  const state = a.state ?? a.address?.district ?? "";

  const streetNumber = [street, number].filter(Boolean).join(", ");
  const postalCode = normalizePostalCode(zip);
  const locality = toTitleCase(city);
  const district = toTitleCase(state);

  return { streetNumber, postalCode, locality, district };
}

export function formatPtAddress(src: AddressInput, separator = " • "): string {
  const { streetNumber, postalCode, locality, district } = extractPtAddressParts(src);
  const line2 = [postalCode, locality].filter(Boolean).join(" ");
  return [streetNumber, line2, district].filter(Boolean).join(separator);
}
