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
  street: string;
  number: string;
  complement: string;
  concelho: string;
} {
  const a: any = src || {};
  // Support both legacy columns (zip_code/city/state/street_number) and newer variants
  // (postal_code/locality/district) as well as nested address payloads.
  const street =
    a.street ??
    a.street_manual ??
    a.address?.street ??
    a.address?.street_manual ??
    "";

  const number =
    a.street_number ??
    a.number ??
    a.address?.street_number ??
    a.address?.number ??
    a.address?.streetNumber ??
    "";

  const complement = a.complement ?? a.address?.complement ?? "";

  const zip =
    a.zip_code ??
    a.postal_code ??
    a.postalCode ??
    a.address?.zip_code ??
    a.address?.postal_code ??
    a.address?.postalCode ??
    "";

  // Localidade
  const explicitLocality = a.locality ?? a.address?.locality;
  const localityRaw = explicitLocality ?? a.city ?? a.address?.city ?? "";

  // Concelho
  let concelhoRaw =
    a.concelho ??
    a.county ??
    a.municipality ??
    a.address?.concelho ??
    a.address?.county ??
    a.address?.municipality ??
    "";
  // If we have an explicit locality field, then `city` is commonly used as concelho.
  if (!concelhoRaw && explicitLocality) {
    concelhoRaw = a.city ?? a.address?.city ?? "";
  }

  // Distrito
  const districtRaw = a.district ?? a.state ?? a.address?.district ?? a.address?.state ?? "";

  const streetNumber = [street, number].filter(Boolean).join(", ");
  const postalCode = normalizePostalCode(zip);
  const locality = toTitleCase(localityRaw);
  const concelho = toTitleCase(concelhoRaw);
  const district = toTitleCase(districtRaw);

  return {
    streetNumber,
    postalCode,
    locality,
    district,
    street: String(street || ""),
    number: String(number || ""),
    complement: String(complement || ""),
    concelho,
  };
}

export function formatPtAddress(src: AddressInput, separator = " • "): string {
  const { streetNumber, postalCode, locality, district } = extractPtAddressParts(src);
  const line2 = [postalCode, locality].filter(Boolean).join(" ");
  return [streetNumber, line2, district].filter(Boolean).join(separator);
}
