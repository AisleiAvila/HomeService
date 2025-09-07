import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  computed,
  viewChild,
  ElementRef,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  User,
  ServiceRequest,
  ChatMessage,
} from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-chat",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./chat.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  serviceRequest = input.required<ServiceRequest>();
  currentUser = input.required<User>();
  close = output<void>();

  private dataService = inject(DataService);

  chatContainer = viewChild<ElementRef<HTMLDivElement>>("chatContainer");

  messages = computed(() => {
    return this.dataService
      .chatMessages()
      .filter((m) => m.request_id === this.serviceRequest().id)
      .map((m) => {
        const sender = this.dataService
          .users()
          .find((u) => u.id === m.sender_id);
        return {
          ...m,
          sender_name: sender?.name || "Unknown",
          sender_avatar_url: sender?.avatar_url,
          isCurrentUser: m.sender_id === this.currentUser().id,
        };
      });
  });

  newMessageText = "";

  constructor() {
    effect(() => {
      const request = this.serviceRequest();
      if (request) {
        this.dataService.fetchChatMessages(request.id);
      }
    });

    effect(() => {
      // Scroll to bottom when new messages arrive
      this.messages(); // depend on messages
      this.scrollToBottom();
    });
  }

  sendMessage() {
    if (!this.newMessageText.trim()) return;

    this.dataService.addChatMessage(
      this.serviceRequest().id,
      this.currentUser().id,
      this.newMessageText.trim()
    );

    this.newMessageText = "";
    setTimeout(() => this.scrollToBottom(), 50);
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer()) {
        const container = this.chatContainer()!.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    } catch (err) {
      console.error("Could not scroll to bottom:", err);
    }
  }
}
