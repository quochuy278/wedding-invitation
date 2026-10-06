import { getRequestConfig } from "next-intl/server";

export const defaultLocale = "vi";

export default getRequestConfig(async () => ({
  locale: defaultLocale,
  messages: (await import(`../messages/${defaultLocale}.json`)).default,
}));
