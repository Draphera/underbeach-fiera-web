import type { ReactNode } from "react";
import BrandFooter from "@/components/ui/brand-footer";

import "../styles/globals.css";

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
import "@/styles/qr/qr.css";
import "@/styles/store/store.css";
import "@/styles/customer/customer.css";
import "@/styles/presentation/presentation.css";

export const metadata = {
  title: "Underbeach Fiera",
  description: "Underbeach retail management platform",
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

        <BrandFooter />
      </body>
    </html>
  );
}
