"use client";

import { useEffect, useState } from "react";
import type { Lang } from "./i18n";

const storageKey = "underbeach-lang";

function getInitialLanguage(): Lang {
  if (typeof window === "undefined") {
    return "it";
  }

  const saved = window.localStorage.getItem(storageKey);
  if (saved === "it" || saved === "en") {
    return saved;
  }

  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "it";
}

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>("it");

  useEffect(() => {
    const initial = getInitialLanguage();
    setLangState(initial);
    document.documentElement.lang = initial;
  }, []);

  function setLang(nextLang: Lang) {
    setLangState(nextLang);
    window.localStorage.setItem(storageKey, nextLang);
    document.documentElement.lang = nextLang;
  }

  return { lang, setLang };
}
