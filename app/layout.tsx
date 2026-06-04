import type { ReactNode } from "react";

import "@/styles/globals.css";

/* CORE */
import "@/styles/core/reset.css";
import "@/styles/core/variables.css";
import "@/styles/core/typography.css";
import "@/styles/core/layout.css";

/* VISUAL ENGINE */
import "@/styles/visual/background.css";
import "@/styles/visual/visual-pack.css";

/* UI COMPONENTS */
import "@/styles/ui/buttons.css";
import "@/styles/ui/language-switcher.css";
import "@/styles/ui/meta-badges.css";

/* PAGES */
import "@/styles/dashboard/dashboard.css";
import "@/styles/form/form.css";

export const metadata = {
  title: "Underbeach Fiera",
  description: "Lead collection system - Fase 1",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="it" className="ub-html">
      <body className="ub-root">
        <div className="ub-bg-photo" />
        <div className="ub-visual-pack" />

        <header className="ub-header-invisible">
          Underbeach - Sistema Lead Fiera
        </header>

        {children}

        <footer className="ub-footer">
          (c) 2026 Underbeach - Sviluppato da Draphera - Brand Pro2Dev
        </footer>
      </body>
    </html>
  );
}
