import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { UiStateService } from "../../../services/ui-state.service";
import { DataService } from "../../../services/data.service";
import { AuthService } from "../../../services/auth.service";
import { I18nService } from "@/src/i18n.service";

// ...existing code...

export class ServiceRequestsComponent {
    private readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    readonly uiState = inject(UiStateService);
    // ...existing code...
}

