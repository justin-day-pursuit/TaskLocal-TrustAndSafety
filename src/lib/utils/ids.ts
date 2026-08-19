import type { TableName } from "@/lib/types/database";

const PREFIXES: Record<Lowercase<TableName>, string> = {
  provider: "prv_",
  listing: "lst_",
  customer: "cus_",
  booking: "bkg_",
  review: "rev_",
};

export type IdEntity = keyof typeof PREFIXES;

function randomSuffix(length = 8): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length);
}

export function generateId(entity: IdEntity): string {
  return `${PREFIXES[entity]}${randomSuffix()}`;
}
