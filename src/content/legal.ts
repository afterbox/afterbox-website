export const legalEmail = "hello@afterbox.co.uk";

export type LegalSection = { heading: string; body: string };
/** `body` can hold several paragraphs, separated by a blank line. */
export type LegalDocument = { title: string; description: string; updated: string; sections: LegalSection[] };

export const terms: LegalDocument = {
  title: "Terms of Service",
  description: "The terms that cover your use of afterbox.",
  updated: "17 November 2026",
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
  updated: "22 November 2026",
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
      body: [
        "The people you choose to share with. Others only when the law requires it. We also use these companies to run afterbox:",
        "Anthropic, our AI model provider. When you scan a document, the document is sent to Anthropic so we can read its details, such as a policy number or renewal date. Separately, to organise your regular payments into categories, we send Anthropic merchant names only, such as 'Disney Plus' or 'PureGym'. We clean these names first: no amounts, dates, account details or anything that identifies you, and we only send a name once several afterbox members pay the same merchant. Anthropic doesn't use this data to train its models.",
        "PostHog, for product analytics, hosted in the EU. We use PostHog to understand how afterbox is used and improve it. PostHog receives your account ID, your email address, and events such as 'connected a bank' or 'added an item', with counts only. It never receives the contents of your record.",
        "Tink, our open banking provider, to connect your bank. Stripe, to take payments. Resend, to send emails. Ably, for live updates in the app. Supabase, for our database and file storage. Railway, to run our servers. Google Cloud, to manage encryption keys.",
      ].join("\n\n"),
    },
    {
      heading: "Merchant categories",
      body: "You can stop your merchant names from being used for categorising in Settings → Privacy. Turning this off doesn't remove categories you already have.",
    },
    {
      heading: "Payment reminders",
      body: "If you're on a paid plan and have reminders on, we prepare emails for upcoming yearly and quarterly payments up to a year ahead. To send them while your record is locked, we keep the payment's name and date encrypted with a key afterbox controls, and delete each one once it's sent. We never store the amount for this.",
    },
    {
      heading: "Where it's stored",
      body: "In the UK and EU. Your data is encrypted to the standard banks use.",
    },
    {
      heading: "How long we keep it",
      body: "While your account is open. When you delete your account, it's closed immediately and permanently deleted within 30 days. Copies in our encrypted backups are removed within a further 7 days. We keep a minimal security log without your email for up to 24 months, and anonymous analytics events linked only to a random ID.",
    },
    {
      heading: "Your rights",
      body: "You can ask to see, correct, export or delete your data, or object to how we use it. You can also complain to the Information Commissioner's Office.",
    },
    { heading: "Changes", body: "If we change this policy, we'll tell you before the changes apply." },
  ],
};
