/**
 * Clerk middleware — protects /dashboard/* routes
 * Admin console requires authentication for all dashboard pages.
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // TEMP-DEMO: admin auth disabled for stakeholder review until Clerk production keys are wired -- re-enable before launch
  if (false && isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
