const productUrl = (
  import.meta.env.VITE_APP_URL?.trim() ||
  (import.meta.env.DEV ? "http://localhost:3000" : "https://app.joinatlus.com")
).replace(/\/$/, "");

export const joinUrl = import.meta.env.DEV
  ? `${productUrl}/onboarding`
  : `${productUrl}/login?mode=signup`;

export const signInUrl = `${productUrl}/login`;
