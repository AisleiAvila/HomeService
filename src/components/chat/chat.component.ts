import { Component, ChangeDetectionStrategy, input, computed, signal, ElementRef, viewChild, afterNextRender, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceRequest, User, ChatMessage } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // FIX: Replaced constructor injection with the inject() function for modern dependency injection.
  dataService = inject(DataService);

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
            const reply = "Thanks for the message, I will get back to you shortly.";
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