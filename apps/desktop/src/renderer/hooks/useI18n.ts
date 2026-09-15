import { createContext, useContext } from "react";
import en from "../locales/en.json";
import es from "../locales/es.json";

const dictionaries: Record<string, any> = { es, en };

interface I18nContextType {
  lang: "es" | "en";
  setLang: (l: "es" | "en") => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextType>({
  lang: "es",
  setLang: () => {},
  t: (key) => key,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function createI18nHelper(lang: "es" | "en") {
  const dict = dictionaries[lang] || dictionaries.es;

  return (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".");
    let val = dict;
    for (const k of keys) {
      val = val?.[k];
    }
    if (typeof val !== "string") {
      // Fallback to English
      let fallbackVal = dictionaries.en;
      for (const k of keys) {
        fallbackVal = fallbackVal?.[k];
      }
      val = typeof fallbackVal === "string" ? fallbackVal : key;
    }

    if (params) {
      let res = val;
      for (const [pk, pv] of Object.entries(params)) {
        res = res.replace(new RegExp(`\\{${pk}\\}`, "g"), String(pv));
      }
      return res;
    }

    return val;
  };
}
