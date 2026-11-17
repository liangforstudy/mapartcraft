import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import FAQ from "./components/faq";
import Root from "./components/root";

import "./index.css";

// The app is served both from the domain root (local/Tailscale) and from a
// GitHub Pages project subdirectory. Derive the router basename from the
// current document URL instead of hard-coding either case.
const appBasePath = new URL(".", document.baseURI).pathname.replace(/\/+$/, "");
const basename = appBasePath || "/";
const appBaseUrl = `${window.location.origin}${basename === "/" ? "/" : basename + "/"}`;

// GitHub Pages serves 404.html for deep links. That page sends the original
// path back here as a query parameter; restore it before React Router starts.
try {
  const redirectParams = new URLSearchParams(window.location.search);
  const redirectTarget = redirectParams.get("spa-redirect");
  if (redirectTarget && redirectTarget.startsWith("/")) {
    window.history.replaceState(null, "", redirectTarget);
  }
} catch (error) {
  console.warn("Could not restore the deep link", error);
}

ReactDOM.render(
  <React.StrictMode>
    <Router basename={basename}>
      <Switch>
        <Route path="/:countryCode?/faq" component={FAQ} />
        <Route path="/:countryCode?" component={Root} />
      </Switch>
    </Router>
  </React.StrictMode>,
  document.getElementById("root")
);

// PWA: the app shell is cached by public/sw.js after the first load. Projects
// and exports remain local-only in IndexedDB / the user's chosen folder.
if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    const swUrl = new URL("sw.js", appBaseUrl).href;
    // updateViaCache: "none" makes the browser always re-download sw.js
    // instead of trusting its HTTP cache, so a new deploy is noticed.
    navigator.serviceWorker
      .register(swUrl, { updateViaCache: "none" })
      .then((registration) => {
        // Check again whenever the tab comes back to the foreground (iOS
        // keeps tabs alive for days without a real reload).
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") registration.update().catch(() => {});
        });
      })
      .catch((error) => {
        console.warn("Service worker registration failed", error);
      });

    // When a new deploy's worker takes over, reload once so the page and its
    // scripts all come from the new build instead of a mix of old and new.
    // Skipped on the very first install, when there was no old worker, and
    // after the first few seconds so it never wipes out work in progress;
    // a later update is simply picked up on the next open.
    const hadController = Boolean(navigator.serviceWorker.controller);
    const loadedAt = Date.now();
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloading || Date.now() - loadedAt > 10000) return;
      reloading = true;
      window.location.reload();
    });
  });
}
