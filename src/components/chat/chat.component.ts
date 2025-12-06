import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  ChatMessage,
  ServiceRequest,
  User
} from "../../models/maintenance.models";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { DataService } from "../../services/data.service";
import { SupabaseService } from "../../services/supabase.service";

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

  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly supabase = inject(SupabaseService);

  chatContainer = viewChild<ElementRef<HTMLDivElement>>("chatContainer");

  isSending = signal(false);
  sendError = signal<string | null>(null);

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
        const channel = this.dataService.listenToChatMessages(request.id);
        
        // Cleanup ao destruir componente
        if (channel) {
          this.destroyRef.onDestroy(() => {
            this.supabase.client.removeChannel(channel);
          });
        }
      }
    });

    effect(() => {
      // Scroll to bottom when new messages arrive
      this.messages(); // depend on messages
      this.scrollToBottom();
    });
  }

  async sendMessage() {
    if (!this.newMessageText.trim() || this.isSending()) return;

    this.isSending.set(true);
    this.sendError.set(null);
    
    const messageText = this.newMessageText.trim();
    this.newMessageText = "";

    try {
      await this.dataService.addChatMessage(
        this.serviceRequest().id,
        this.currentUser().id,
        messageText
      );
      setTimeout(() => this.scrollToBottom(true), 50);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      this.sendError.set('Falha ao enviar mensagem');
      this.newMessageText = messageText; // Restaurar mensagem
    } finally {
      this.isSending.set(false);
    }
  }

  private scrollToBottom(force = false): void {
    const container = this.chatContainer()?.nativeElement;
    if (!container) return;

    // Apenas fazer scroll se estiver perto do fim ou forçado
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (force || isNearBottom) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }
}
