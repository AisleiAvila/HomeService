import { Component, ChangeDetectionStrategy, input, computed, signal, ElementRef, viewChild, afterNextRender, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceRequest, User, ChatMessage } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';
import { I18nService } from '../../services/i18n.service';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'h-full'
  }
})
export class ChatComponent {
  serviceRequest = input.required<ServiceRequest>();
  currentUser = input.required<User>();
  
  messagesContainer = viewChild<ElementRef>('messagesContainer');
  newMessage = signal('');

  dataService = inject(DataService);
  i18n = inject(I18nService);

  constructor() {
    afterNextRender(() => {
      this.scrollToBottom();
    });
  }

  messages = computed(() => {
    return this.dataService.getMessagesForService(this.serviceRequest().id);
  });
  
  otherUser = computed(() => {
      const request = this.serviceRequest();
      const currentUserId = this.currentUser().id;
      const otherUserId = request.clientId === currentUserId ? request.professionalId : request.clientId;
      return otherUserId ? this.dataService.getUserById(otherUserId) : null;
  });

  sendMessage() {
    const text = this.newMessage().trim();
    if (text) {
      this.dataService.addMessage(this.serviceRequest().id, this.currentUser().id, text);
      this.newMessage.set('');
      
      // Simulate reply from other user after a delay
      this.simulateReply();

      // Defer scroll to allow DOM update
      setTimeout(() => this.scrollToBottom(), 0);
    }
  }

  private simulateReply() {
    const other = this.otherUser();
    if (other) {
        setTimeout(() => {
            const reply = this.i18n.translate('chatSimulatedReply');
            this.dataService.addMessage(this.serviceRequest().id, other.id, reply);
            setTimeout(() => this.scrollToBottom(), 0);
        }, 1500);
    }
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}