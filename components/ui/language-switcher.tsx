"use client";

import type { Lang } from "@/lib/i18n";

type LanguageSwitcherProps = {
  lang: Lang;
  onChange: (lang: Lang) => void;
  className?: string;
};

export default function LanguageSwitcher({
  lang,
  onChange,
  className = "",
}: LanguageSwitcherProps) {
  const toggle = () => onChange(lang === "it" ? "en" : "it");

  return (
    <button
      className={`ub-lang-toggle ${className}`}
      onClick={toggle}
      aria-label="Change language"
    >
      <span
        className={`ub-lang-toggle__option ${lang === "it" ? "active" : ""}`}
      >
        IT
      </span>
      <span
        className={`ub-lang-toggle__option ${lang === "en" ? "active" : ""}`}
      >
        EN
      </span>

      <div
        className={`ub-lang-toggle__indicator ${
          lang === "it" ? "left" : "right"
        }`}
      />
    </button>
  );
}
