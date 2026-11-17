export const legalEmail = "hello@afterbox.co.uk";
export const legalUpdated = "17 November 2026";

export type LegalSection = { heading: string; body: string };
export type LegalDocument = { title: string; description: string; sections: LegalSection[] };

export const terms: LegalDocument = {
  title: "Terms of Service",
  description: "The terms that cover your use of afterbox.",
  sections: [
    {
      heading: "About these terms",
      body: "These terms cover your use of afterbox, run by Afterbox. By creating an account, you agree to them.",
    },
    { heading: "Who can use afterbox", body: "You must be 18 or over." },
    {
      heading: "Your account",
      body: "Keep access to your email and Google account secure. You are responsible for what happens in your account.",
    },
    {
      heading: "What afterbox does",
      body: "afterbox helps you keep track of what you own and share it with people you trust. It does not give financial, legal or tax advice. Values we show, such as home prices, are estimates.",
    },
    {
      heading: "Connecting your bank",
      body: "We connect to your bank through open banking, with your permission. Access is read-only: we cannot move your money. You can disconnect at any time.",
    },
    { heading: "Sharing", body: "You choose who sees what. You can stop sharing at any time." },
    {
      heading: "Your content",
      body: "What you add stays yours. You allow us to store and use it only to run afterbox for you.",
    },
    {
      heading: "Fair use",
      body: "Don't misuse afterbox, try to access other people's records, or break the law using it. We may suspend accounts that do.",
    },
    {
      heading: "Closing your account",
      body: "You can close your account at any time. We delete your data within 30 days.",
    },
    {
      heading: "Our responsibility",
      body: "We work hard to keep afterbox accurate and available, but we can't promise it will always be. Nothing in these terms limits rights you have by law.",
    },
    { heading: "Changes", body: "If we change these terms, we'll tell you before the changes apply." },
    { heading: "Law", body: "These terms are governed by the law of England and Wales." },
    { heading: "Contact", body: `Questions? Email ${legalEmail}.` },
  ],
};

export const privacy: LegalDocument = {
  title: "Privacy Policy",
  description: "What personal data afterbox collects, how we use it and the rights you have.",
  sections: [
    {
      heading: "Who we are",
      body: `afterbox is run by Afterbox. We are responsible for your personal data. Contact us at ${legalEmail}.`,
    },
    {
      heading: "What we collect",
      body: "Your email, and your name if you sign in with Google. What you add, such as accounts, policies, documents and photos. Bank data you allow us to read through open banking, such as accounts, balances and transactions. Analytics about how you use afterbox, such as pages visited and device type.",
    },
    {
      heading: "How we use it",
      body: "To run afterbox: finding your accounts, keeping values up to date and sharing with the people you choose. To keep your account secure, and to improve afterbox. We never sell your data.",
    },
    {
      heading: "Who we share it with",
      body: "The people you choose to share with. Our open banking provider, to connect your bank. Others only when the law requires it.",
    },
    {
      heading: "Where it's stored",
      body: "In the UK and EU. Your data is encrypted to the standard banks use.",
    },
    {
      heading: "How long we keep it",
      body: "While your account is open. When you close it, we delete your data within 30 days.",
    },
    {
      heading: "Your rights",
      body: "You can ask to see, correct, export or delete your data, or object to how we use it. You can also complain to the Information Commissioner's Office.",
    },
    { heading: "Changes", body: "If we change this policy, we'll tell you before the changes apply." },
  ],
};
