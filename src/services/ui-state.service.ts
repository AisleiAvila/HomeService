import { Injectable, signal } from "@angular/core";
import type { ServiceRequest } from "../models/maintenance.models";

@Injectable({ providedIn: "root" })
export class UiStateService {
  isChatOpen = signal(false);
  selectedRequest = signal<ServiceRequest | null>(null);

  openChat(request: ServiceRequest) {
    this.selectedRequest.set(request);
    this.isChatOpen.set(true);
  }

  closeChat() {
    this.isChatOpen.set(false);
    this.selectedRequest.set(null);
  }
}
