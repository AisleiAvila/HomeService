import "@angular/compiler";

import { provideRouter } from "@angular/router";
import { routes } from "./src/app/app.routes";

import { provideZonelessChangeDetection, LOCALE_ID } from "@angular/core";
import { provideHttpClient, withFetch } from "@angular/common/http";
import { bootstrapApplication } from "@angular/platform-browser";
import { registerLocaleData } from "@angular/common";
import localeEn from "@angular/common/locales/en";
import localePt from "@angular/common/locales/pt";
import localeDE from "@angular/common/locales/de"; // Germany uses Euro

import { AppComponent } from "./src/app.component";

// Register locale data for currency formatting
registerLocaleData(localeEn);
registerLocaleData(localePt);
registerLocaleData(localeDE); // Germany locale for Euro support

// Add Tailwind CSS (temporary CDN solution for development)
const tailwindScript = document.createElement("script");
tailwindScript.src = "https://cdn.tailwindcss.com";
document.head.appendChild(tailwindScript);

try {
  await bootstrapApplication(AppComponent, {
    providers: [
      provideRouter(routes),
      provideZonelessChangeDetection(),
      provideHttpClient(withFetch()), // Enable HTTP client with fetch API
      { provide: LOCALE_ID, useValue: "de" }, // German locale for Euro
    ],
  });
} catch (err) {
  console.error(err);
}

// AI Studio always uses an `index.tsx` file for all project types.
