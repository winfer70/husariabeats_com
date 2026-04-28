// middleware.ts — locale detection and routing
// Redirects / to /pl (default) or /en based on Accept-Language header.
import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales:       ["pl", "en"],
  defaultLocale: "pl",
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
