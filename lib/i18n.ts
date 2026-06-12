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
        "Creare e gestire la relazione con i propri clienti non è mai stato così semplice",
      lead:
        "La piattaforma enterprise per acquisire, qualificare e attivare punti vendita balneari durante Maredamare.",
      meta: ["Maredamare", "Underbeach.eu", "Retail balneare"],
      cta: "Inizia la registrazione",
    },
    form: {
      eyebrow: "maredamare / underbeach.eu",
      title: "Registrazione negozio",
      lead:
        "Inserisci i dati commerciali e il referente: la richiesta verra' salvata nel sistema Underbeach e valutata per l'attivazione.",
      storeData: "Dati punto vendita",
      contactData: "Referente e canali",
      businessName: "Ragione sociale",
      address: "Indirizzo",
      zip: "CAP",
      city: "Citta",
      province: "Provincia",
      storePhone: "Telefono negozio",
      vat: "Partita IVA",
      firstName: "Nome referente",
      lastName: "Cognome referente",
      mobile: "Cellulare referente",
      email: "Email referente",
      website: "Sito internet",
      social: "Social",
      logo: "Logo negozio",
      privacySection: "Privacy e consenso",
      privacyConsent:
        "Dichiaro di aver letto l'informativa privacy e acconsento al trattamento dei dati per la gestione della registrazione e della valutazione Underbeach.",
      privacyRequired: "Campo obbligatorio per completare la registrazione.",
      optional: "Opzionale",
      submit: "Invia registrazione",
      cancel: "Cancella",
      sending: "Invio...",
      successEyebrow: "registrazione acquisita",
      successTitle: "Grazie!",
      successText:
        "La registrazione e' stata ricevuta. Ti abbiamo inviato una mail di conferma; il team Underbeach prendera' ora in carico la valutazione per l'attivazione manuale.",
      successEmailPending:
        "La registrazione e' stata ricevuta e sara' valutata manualmente dal team Underbeach. La mail di conferma non e' partita: conserva questa schermata come conferma.",
      backHome: "Torna alla home",
      errors: {
        zip: "Il CAP deve contenere 5 cifre.",
        vat: "La Partita IVA deve contenere 11 cifre.",
        storePhone: "Il telefono del negozio deve contenere almeno 6 cifre.",
        mobile: "Il cellulare del referente deve contenere almeno 8 cifre.",
        email: "Inserisci un indirizzo email valido.",
        privacy: "Devi accettare l'informativa privacy per procedere.",
        registrationPermission:
          "La registrazione e' temporaneamente bloccata dalla configurazione del database. Contatta il team Underbeach.",
        logoType: "Il logo deve essere un file PNG o JPG.",
        logoSize: "Il logo non puo' superare i 5MB.",
        generic: "Si e' verificato un errore. Riprova tra qualche secondo.",
      },
    },
    success: {
      eyebrow: "registrazione acquisita",
      title: "Grazie!",
      text:
        "La registrazione e' stata ricevuta. Il team Underbeach procedera' con la valutazione manuale per l'attivazione.",
      backHome: "Torna alla home",
    },
  },
  en: {
    home: {
      eyebrow: "underbeach.eu / maredamare",
      title: "Underbeach",
      slogan:
        "Building and managing relationships with your customers has never been easier",
      lead:
        "The enterprise platform to acquire, qualify and activate beach retail partners during Maredamare.",
      meta: ["Maredamare", "Underbeach.eu", "Beach retail"],
      cta: "Start registration",
    },
    form: {
      eyebrow: "maredamare / underbeach.eu",
      title: "Store registration",
      lead:
        "Enter the company and contact details: the request will be saved in the Underbeach system and reviewed for activation.",
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
      email: "Contact email",
      website: "Website",
      social: "Social",
      logo: "Store logo",
      privacySection: "Privacy and consent",
      privacyConsent:
        "I confirm that I have read the privacy notice and consent to data processing for registration management and the Underbeach evaluation process.",
      privacyRequired: "Required to complete the registration.",
      optional: "Optional",
      submit: "Submit registration",
      cancel: "Clear",
      sending: "Sending...",
      successEyebrow: "registration received",
      successTitle: "Thank you!",
      successText:
        "Your registration has been received. We sent you a confirmation email; the Underbeach team will now manually review it for activation.",
      successEmailPending:
        "Your registration has been received and will be reviewed manually by the Underbeach team. The confirmation email could not be sent, so please keep this screen as confirmation.",
      backHome: "Back to home",
      errors: {
        zip: "The ZIP code must contain 5 digits.",
        vat: "The VAT number must contain 11 digits.",
        storePhone: "The store phone must contain at least 6 digits.",
        mobile: "The contact mobile must contain at least 8 digits.",
        email: "Enter a valid email address.",
        privacy: "You must accept the privacy notice to continue.",
        registrationPermission:
          "Registration is temporarily blocked by the database configuration. Please contact the Underbeach team.",
        logoType: "The logo must be a PNG or JPG file.",
        logoSize: "The logo cannot exceed 5MB.",
        generic: "Something went wrong. Please try again in a few seconds.",
      },
    },
    success: {
      eyebrow: "registration received",
      title: "Thank you!",
      text:
        "The registration has been received. The Underbeach team will manually review it for activation.",
      backHome: "Back to home",
    },
  },
} satisfies Record<Lang, unknown>;
