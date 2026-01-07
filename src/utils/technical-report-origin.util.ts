import type { ServiceRequest, ServiceRequestOrigin } from "../models/maintenance.models";
import type { TechnicalReportOriginKey } from "../services/technical-report-pdf.service";

function normalizeOriginName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

type OriginsById = ReadonlyMap<number, ServiceRequestOrigin> | Readonly<Record<number, ServiceRequestOrigin>>;

const ORIGIN_ID_WORTEN = 2;
const ORIGIN_ID_RADIO_POPULAR = 4;

function getOriginNameFromRequest(request: ServiceRequest, originsById?: OriginsById): string | null {
  if (request.origin?.name) return request.origin.name;

  const originId = request.origin_id;
  if (!originId || !originsById) return null;

  if (originsById instanceof Map) {
    return originsById.get(originId)?.name ?? null;
  }

  return originsById[originId]?.name ?? null;
}

export function getTechnicalReportOriginKey(
  request: ServiceRequest,
  originsById?: OriginsById
): TechnicalReportOriginKey | null {
  // Deterministic mapping when origin_id is known.
  // - origin_id=4: Rádio Popular
  // - origin_id=2: Worten (ambíguo: utilizador escolhe Verde/Azul no modal)
  if (request.origin_id === ORIGIN_ID_RADIO_POPULAR) return "radio_popular";

  const nameRaw = getOriginNameFromRequest(request, originsById);
  if (!nameRaw) return null;

  const name = normalizeOriginName(nameRaw);

  const isWorten = name.includes("worten");
  const isRadioPopular = name.includes("radio popular") || name.includes("radiopopular");

  if (isRadioPopular) return "radio_popular";

  if (isWorten && name.includes("verde")) return "worten_verde";
  if (isWorten && name.includes("azul")) return "worten_azul";

  // Defensive matches for possible naming variants
  if (name.includes("worten resolve") && name.includes("verde")) return "worten_verde";
  if (name.includes("worten resolve") && name.includes("azul")) return "worten_azul";

  return null;
}

export function isTechnicalReportEligible(
  request: ServiceRequest,
  originsById?: OriginsById
): boolean {
  if (request.origin_id === ORIGIN_ID_WORTEN) return true;
  if (request.origin_id === ORIGIN_ID_RADIO_POPULAR) return true;
  return getTechnicalReportOriginKey(request, originsById) !== null;
}

export function getTechnicalReportOriginLabel(origin: TechnicalReportOriginKey): string {
  switch (origin) {
    case "worten_verde":
      return "Worten Resolve (Verde)";
    case "worten_azul":
      return "Worten Resolve (Azul)";
    case "radio_popular":
      return "Rádio Popular";
  }
}
