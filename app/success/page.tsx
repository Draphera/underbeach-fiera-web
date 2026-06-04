"use client";

import LanguageSwitcher from "@/components/ui/language-switcher";
import { copy } from "@/lib/i18n";
import { useLanguage } from "@/lib/use-language";

export default function SuccessPage() {
  const { lang, setLang } = useLanguage();
  const text = copy[lang].success;

  return (
    <main className="fiera-page fiera-submit-screen">
      <LanguageSwitcher lang={lang} onChange={setLang} />

      <section className="fiera-submit-panel" aria-label="Registrazione inviata">
        <p className="fiera-eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p>{text.text}</p>
        <a className="ub-primary-button" href="/">
          {text.backHome}
        </a>
      </section>
    </main>
  );
}
