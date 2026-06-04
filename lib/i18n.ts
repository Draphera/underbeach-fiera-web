export type Lang = "it" | "en";

export const languages: { code: Lang; label: string; name: string }[] = [
  { code: "it", label: "IT", name: "Italiano" },
  { code: "en", label: "EN", name: "English" },
];

export const copy = {
  it: {
    home: {
      eyebrow: "underbeach.eu / maredamare",
      title: "Underbeach",
      slogan:
        "L'infrastruttura che standardizza, qualifica e attiva il retail balneare.",
      lead:
        "La piattaforma enterprise per acquisire, qualificare e attivare punti vendita balneari durante Maredamare.",
      meta: ["Maredamare", "Underbeach.eu", "Retail balneare"],
      cta: "Inizia la registrazione",
    },
    form: {
      eyebrow: "maredamare / underbeach.eu",
      title: "Registrazione negozio",
      lead:
        "Inserisci i dati commerciali e il referente: il lead verrà salvato direttamente nel sistema di raccolta Underbeach.",
      storeData: "Dati punto vendita",
      contactData: "Referente e canali",
      businessName: "Ragione sociale",
      address: "Indirizzo",
      zip: "CAP",
      city: "Città",
      province: "Provincia",
      storePhone: "Telefono negozio",
      vat: "Partita IVA",
      firstName: "Nome referente",
      lastName: "Cognome referente",
      mobile: "Cellulare referente",
      website: "Sito internet",
      social: "Social",
      logo: "Logo negozio",
      optional: "Opzionale",
      submit: "Invia registrazione",
      sending: "Invio...",
      successEyebrow: "lead acquisito",
      successTitle: "Grazie!",
      successText:
        "La registrazione è stata inviata correttamente. Il contatto è ora pronto per il follow-up Underbeach.",
      backHome: "Torna alla home",
      errors: {
        zip: "Il CAP deve contenere 5 cifre.",
        vat: "La Partita IVA deve contenere 11 cifre.",
        storePhone: "Il telefono del negozio deve contenere almeno 6 cifre.",
        mobile: "Il cellulare del referente deve contenere almeno 8 cifre.",
        logoType: "Il logo deve essere un file PNG o JPG.",
        logoSize: "Il logo non può superare i 5MB.",
        generic: "Si è verificato un errore. Riprova tra qualche secondo.",
      },
    },
    success: {
      eyebrow: "lead acquisito",
      title: "Grazie!",
      text:
        "La registrazione è stata inviata correttamente. Il team Underbeach potrà procedere con la qualificazione del contatto.",
      backHome: "Torna alla home",
    },
  },
  en: {
    home: {
      eyebrow: "underbeach.eu / maredamare",
      title: "Underbeach",
      slogan:
        "The infrastructure that standardizes, qualifies and activates beach retail.",
      lead:
        "The enterprise platform to acquire, qualify and activate beach retail partners during Maredamare.",
      meta: ["Maredamare", "Underbeach.eu", "Beach retail"],
      cta: "Start registration",
    },
    form: {
      eyebrow: "maredamare / underbeach.eu",
      title: "Store registration",
      lead:
        "Enter the company and contact details: the lead will be saved directly into the Underbeach collection system.",
      storeData: "Store details",
      contactData: "Contact and channels",
      businessName: "Company name",
      address: "Address",
      zip: "ZIP code",
      city: "City",
      province: "Province",
      storePhone: "Store phone",
      vat: "VAT number",
      firstName: "Contact first name",
      lastName: "Contact last name",
      mobile: "Contact mobile",
      website: "Website",
      social: "Social",
      logo: "Store logo",
      optional: "Optional",
      submit: "Submit registration",
      sending: "Sending...",
      successEyebrow: "lead captured",
      successTitle: "Thank you!",
      successText:
        "The registration has been submitted successfully. The contact is now ready for Underbeach follow-up.",
      backHome: "Back to home",
      errors: {
        zip: "The ZIP code must contain 5 digits.",
        vat: "The VAT number must contain 11 digits.",
        storePhone: "The store phone must contain at least 6 digits.",
        mobile: "The contact mobile must contain at least 8 digits.",
        logoType: "The logo must be a PNG or JPG file.",
        logoSize: "The logo cannot exceed 5MB.",
        generic: "Something went wrong. Please try again in a few seconds.",
      },
    },
    success: {
      eyebrow: "lead captured",
      title: "Thank you!",
      text:
        "The registration has been submitted successfully. The Underbeach team can now qualify the contact.",
      backHome: "Back to home",
    },
  },
} satisfies Record<Lang, unknown>;
