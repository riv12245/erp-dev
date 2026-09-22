import { en } from './en.js';
import { es } from './es.js';

export type Locale = 'en' | 'es';

export const locales: readonly Locale[] = ['en', 'es'];

export type MessageKey = keyof typeof en;

const dictionaries: Record<Locale, Record<string, string>> = {
  en: flatten(en),
  es: flatten(es),
};

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flatten(value as Record<string, unknown>, path));
    } else {
      result[path] = String(value);
    }
  }
  return result;
}

export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[locale] ?? dictionaries.en;
  let message = dict[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      message = message.replace(`{${name}}`, String(value));
    }
  }
  return message;
}

export function currentLocale(): Locale {
  return 'en';
}

export { dictionaries };