"use client";

import "../styles/home/home.css";
import LanguageSwitcher from "@/components/ui/language-switcher";
import StartButton from "@/components/ui/start-button";
import { copy } from "@/lib/i18n";
import { useLanguage } from "@/lib/use-language";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const text = copy[lang].home;

  return (
    <main className="ub-home ub-home--premium">
      <header className="ub-home__topbar">
        <span>{text.eyebrow}</span>
        <LanguageSwitcher lang={lang} onChange={setLang} />
      </header>

      <section className="ub-home__center" aria-label="Underbeach Maredamare">
        <img src="/logo.png" alt="Underbeach" className="ub-home__logo" />

        <p className="ub-home__slogan">{text.slogan}</p>

        <StartButton
          className="ub-home__cta"
          onClick={() => router.push("/form")}
        >
          {text.cta}
        </StartButton>

        <p className="ub-home__microcopy">
          {lang === "it"
            ? "Registrazione in meno di 30 secondi"
            : "Registration in under 30 seconds"}
        </p>
      </section>

    </main>
  );
}
