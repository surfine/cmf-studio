import { en, type StringKey } from "./en.ts";
import { zh } from "./zh.ts";

export type { StringKey };
export type Language = "en" | "zh";

const tables: Record<Language, Record<StringKey, string>> = { en, zh };

/** The translated string, with {name} placeholders filled from `values`. */
export function translate(language: Language, key: StringKey, values: Record<string, string | number> = {}): string {
  const text = tables[language][key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}
