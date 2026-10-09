/* Firebase initialisation. The SDK is loaded from Google's CDN through the
   import map in each page's <head>; the project settings come from the
   build-time generated firebase-config.js (never stored in the repository). */
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig, features } from "../firebase-config.js";

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && firebaseConfig.authDomain);
export { features };

let services = null;

/** Lazily creates the Firebase app so unconfigured builds still render a clear notice. */
export async function getServices() {
  if (!isConfigured) throw Object.assign(new Error("Firebase is not configured"), { code: "app/not-configured" });
  if (services) return services;
  const app = initializeApp(firebaseConfig);
  if (features.appCheckSiteKey) {
    // App Check proves requests come from this real site, blocking scripted abuse.
    const { initializeAppCheck, ReCaptchaV3Provider } = await import("firebase/app-check");
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(features.appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  }
  services = { app, auth: getAuth(app), db: getFirestore(app) };
  return services;
}
