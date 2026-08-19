import type { TableName } from "@/lib/types/database";

const PREFIXES: Record<Lowercase<TableName>, string> = {
  provider: "prv_",
  listing: "lst_",
  customer: "cus_",
  booking: "bkg_",
  review: "rev_",
};

export type IdEntity = keyof typeof PREFIXES;

function randomSuffix(length = 3): string {
  const max = 10 ** length;
  const value = Math.floor(Math.random() * max);
  return value.toString().padStart(length, "0");
}

export function generateId(entity: IdEntity): string {
  return `${PREFIXES[entity]}${randomSuffix()}`;
}
