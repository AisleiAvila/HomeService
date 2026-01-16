import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type ServiceTimeZone = "Europe/Lisbon" | "Atlantic/Azores";

export function normalizeServiceTimeZone(
  timeZone: string | null | undefined
): ServiceTimeZone {
  return timeZone === "Atlantic/Azores" ? "Atlantic/Azores" : "Europe/Lisbon";
}

export function inferServiceTimeZoneFromPostalCode(
  postalCode: string | null | undefined
): ServiceTimeZone {
  const digits = (postalCode ?? "").replaceAll(/\D/g, "");
  const prefix2 = digits.slice(0, 2);

  // Azores are typically 95xx-99xx. Madeira is 90xx and uses Europe/Lisbon.
  return prefix2 >= "95" && prefix2 <= "99" ? "Atlantic/Azores" : "Europe/Lisbon";
}

export function getServiceTimeZoneForRequest(req: {
  service_time_zone?: string | null;
  zip_code?: string | null;
  postal_code?: string | null;
  postalCode?: string | null;
  address?: { zip_code?: string | null; postal_code?: string | null } | null;
}): ServiceTimeZone {
  const zip =
    req.zip_code ??
    req.postal_code ??
    req.postalCode ??
    req.address?.zip_code ??
    req.address?.postal_code ??
    "";

  const inferred = inferServiceTimeZoneFromPostalCode(zip);
  const persisted = req.service_time_zone
    ? normalizeServiceTimeZone(req.service_time_zone)
    : null;

  // Prefer an explicit Azores value if persisted; otherwise allow zip-based inference.
  // This avoids the common pitfall where DB defaulted to Europe/Lisbon.
  if (persisted === "Atlantic/Azores") return "Atlantic/Azores";
  if (inferred === "Atlantic/Azores") return "Atlantic/Azores";
  return persisted ?? inferred;
}

export function isOffsetDateTimeString(value: string): boolean {
  // Examples:
  // - 2026-01-15T10:00:00.000Z
  // - 2026-01-15T10:00:00+00:00
  // - 2026-01-15T10:00:00-01:00
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}

/**
 * Converts a `datetime-local` value (YYYY-MM-DDTHH:mm) representing local time in `timeZone`
 * into a UTC ISO string.
 */
export function localDateTimeToUtcIso(
  localDateTime: string,
  timeZone: string
): string {
  const trimmed = (localDateTime ?? "").trim();
  if (!trimmed) {
    throw new Error("localDateTimeToUtcIso: localDateTime is empty");
  }

  const utcDate = fromZonedTime(trimmed, timeZone);
  return utcDate.toISOString();
}

/**
 * Formats an ISO datetime into `YYYY-MM-DD` and `HH:mm` in the given IANA `timeZone`.
 */
export function utcIsoToLocalParts(
  isoDateTime: string,
  timeZone: string
): { date: string; time: string; dateTimeLocal: string } {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) {
    return { date: "", time: "", dateTimeLocal: "" };
  }

  const datePart = formatInTimeZone(date, timeZone, "yyyy-MM-dd");
  const timePart = formatInTimeZone(date, timeZone, "HH:mm");

  return { date: datePart, time: timePart, dateTimeLocal: `${datePart}T${timePart}` };
}
