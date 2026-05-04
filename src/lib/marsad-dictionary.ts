import dictionary from "./marsad-dictionary.json";

export interface CodeRow {
  code: string;
  description?: string;
  shortDescription?: string;
  longDescription?: string;
}

export interface DataElement {
  id: string;
  number: number;
  name: string;
  definition?: string;
  dataType?: string;
  format?: string;
  mandatory?: string;
  encounterTypes?: string;
  codeSet?: string;
  guidance?: string;
  validationRules?: string;
  maxOccurrences?: string;
  classification?: string;
  codeTable?: CodeRow[] | null;
  rawText?: string;
}

export interface Domain {
  id: string;
  name: string;
  elementCount: number;
  elements: DataElement[];
}

export interface Dictionary {
  version: string;
  domains: Domain[];
}

export const MARSAD: Dictionary = dictionary as Dictionary;

export const TOTAL_ELEMENTS = MARSAD.domains.reduce(
  (n, d) => n + d.elementCount,
  0
);

export const CLASSIFICATIONS = [
  "Public",
  "Confidential",
  "Secret",
  "Top Secret",
] as const;

export type Classification = (typeof CLASSIFICATIONS)[number];

export const DATA_TYPES = Array.from(
  new Set(
    MARSAD.domains.flatMap((d) =>
      d.elements.map((e) => (e.dataType || "").trim()).filter(Boolean)
    )
  )
).sort();
