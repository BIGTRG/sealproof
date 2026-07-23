/**
 * Clerk middleware — protects /dashboard/* and /session/* routes
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  // /session/onboard is intentionally public: pre-account application wizard

  // '/dashboard(.*)', // TEMP public for stakeholder review, re-protect before launch
  // TEMP-DEMO-active: re-enable before launch
  // '/session/active(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
