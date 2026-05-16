import { getNested, interpolate } from "./get-nested";
import { messages as en } from "./locales/en";
import { messages as vi } from "./locales/vi";
import type { Locale, Messages } from "./types";

export type { Locale, Messages };

export const LOCALES: { value: Locale; labelKey: "common.vietnamese" | "common.english" }[] = [
  { value: "vi", labelKey: "common.vietnamese" },
  { value: "en", labelKey: "common.english" },
];

export const DEFAULT_LOCALE: Locale = "vi";

export const messages = { en, vi } satisfies Record<Locale, Messages>;

export function createTranslator(locale: Locale) {
  const dict = messages[locale] as Record<string, unknown>;
  return function t(
    key: string,
    params?: Record<string, string | number>,
  ): string {
    const raw = getNested(dict, key);
    if (raw === undefined) return key;
    return interpolate(raw, params);
  };
}
