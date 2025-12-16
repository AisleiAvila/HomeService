import "@angular/compiler";

import { provideRouter } from "@angular/router";
import { routes } from "./src/app/app.routes";

import { provideZonelessChangeDetection, LOCALE_ID, APP_INITIALIZER } from "@angular/core";
import { provideHttpClient, withFetch } from "@angular/common/http";
import { bootstrapApplication } from "@angular/platform-browser";
import { registerLocaleData } from "@angular/common";
import localeEn from "@angular/common/locales/en";
import localePt from "@angular/common/locales/pt";
import localeDE from "@angular/common/locales/de"; // Germany uses Euro

import { AppComponent } from "./src/app.component";
import { AuthService } from "./src/services/auth.service";

// Register locale data for currency formatting
registerLocaleData(localeEn);
registerLocaleData(localePt);
registerLocaleData(localeDE); // Germany locale for Euro support

try {
  await bootstrapApplication(AppComponent, {
    providers: [
      provideRouter(routes),
      provideZonelessChangeDetection(),
      provideHttpClient(withFetch()), // Enable HTTP client with fetch API
      { provide: LOCALE_ID, useValue: "de" }, // German locale for Euro
      {
        provide: APP_INITIALIZER,
        useFactory: (authService: AuthService) => {
          return () => {
            console.log("🔄 Recuperando sessão autenticada do localStorage...");
            return authService.restoreSessionFromStorage();
          };
        },
        deps: [AuthService],
        multi: true,
      },
    ],
  });
} catch (err) {
  console.error(err);
}

// AI Studio always uses an `index.tsx` file for all project types.
