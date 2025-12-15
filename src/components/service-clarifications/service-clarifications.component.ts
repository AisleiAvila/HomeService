import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { I18nService } from "../../i18n.service";
import { ServiceRequest, User } from "../../models/maintenance.models";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { DataService } from "../../services/data.service";

@Component({
  selector: "app-service-clarifications",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {{ "clarifications" | i18n }}
          </h3>
          @if (unreadCount() > 0) {
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
            {{ unreadCount() }} {{ "unread" | i18n }}
          </span>
          }
        </div>
      </div>

      <!-- Content -->
      <div class="p-4 space-y-4">
        <!-- Add New Question Form -->
        @if (canAddQuestion()) {
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-brand-primary-50 dark:bg-brand-primary-900/20">
          <h4 class="text-sm font-medium text-gray-800 dark:text-gray-100 mb-3">
            {{ "addNewQuestion" | i18n }}
          </h4>
          <div class="space-y-3">
            <div>
              <label for="questionTitle" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ "questionTitle" | i18n }}
              </label>
              <input
                id="questionTitle"
                type="text"
                [(ngModel)]="newQuestionTitle"
                name="questionTitle"
                [placeholder]="'questionTitlePlaceholder' | i18n"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-brand-primary-500 focus:border-brand-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label for="questionContent" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ "questionContent" | i18n }}
              </label>
              <textarea
                id="questionContent"
                [(ngModel)]="newQuestionContent"
                name="questionContent"
                rows="3"
                [placeholder]="'questionContentPlaceholder' | i18n"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-brand-primary-500 focus:border-brand-primary-500 sm:text-sm"
              ></textarea>
            </div>
            <div class="flex justify-end space-x-2">
              <button
                (click)="clearQuestionForm()"
                type="button"
                class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {{ "cancel" | i18n }}
              </button>
              <button
                (click)="addQuestion()"
                [disabled]="!newQuestionTitle() || !newQuestionContent() || isSubmitting()"
                type="button"
                class="px-3 py-2 text-sm font-medium text-white bg-brand-primary-600 border border-transparent rounded-md hover:bg-brand-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (isSubmitting()) {
                <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                }
                {{ "addQuestion" | i18n }}
              </button>
            </div>
          </div>
        </div>
        }

        <!-- Clarifications List -->
        @if (clarificationThreads().length > 0) {
        <div class="space-y-6">
          @for (thread of clarificationThreads(); track thread.question.id) {
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <!-- Question -->
            <div class="bg-yellow-50 dark:bg-yellow-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                      {{ "question" | i18n }}
                    </span>
                    @if (!thread.question.is_read && thread.question.user_id !== currentUser().id) {
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                      {{ "new" | i18n }}
                    </span>
                    }
                  </div>
                  <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {{ thread.question.title }}
                  </h4>
                  <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">
                    {{ thread.question.content }}
                  </p>
                  <div class="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>{{ "by" | i18n }} {{ thread.question.user_name || "Unknown" }}</span>
                    <span class="mx-2">•</span>
                    <span>{{ thread.question.created_at | date : "medium" }}</span>
                    @if (thread.question.user_role) {
                    <span class="mx-2">•</span>
                    <span class="capitalize">{{ thread.question.user_role }}</span>
                    }
                  </div>
                </div>
                @if (thread.question.user_id === currentUser().id) {
                <button
                  (click)="deleteClarification(thread.question.id)"
                  class="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 ml-2"
                  title="{{ 'delete' | i18n }}"
                >
                  <i class="fas fa-trash text-sm"></i>
                </button>
                }
              </div>
            </div>

            <!-- Answers -->
            @if (thread.answers.length > 0) {
            <div class="bg-white dark:bg-gray-800">
              @for (answer of thread.answers; track answer.id) {
              <div class="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        {{ "answer" | i18n }}
                      </span>
                      @if (!answer.is_read && answer.user_id !== currentUser().id) {
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                        {{ "new" | i18n }}
                      </span>
                      }
                    </div>
                    <h5 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {{ answer.title }}
                    </h5>
                    <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">
                      {{ answer.content }}
                    </p>
                    <div class="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span>{{ "by" | i18n }} {{ answer.user_name || "Unknown" }}</span>
                      <span class="mx-2">•</span>
                      <span>{{ answer.created_at | date : "medium" }}</span>
                      @if (answer.user_role) {
                      <span class="mx-2">•</span>
                      <span class="capitalize">{{ answer.user_role }}</span>
                      }
                    </div>
                  </div>
                  @if (answer.user_id === currentUser().id) {
                  <button
                    (click)="deleteClarification(answer.id)"
                    class="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 ml-2"
                    title="{{ 'delete' | i18n }}"
                  >
                    <i class="fas fa-trash text-sm"></i>
                  </button>
                  }
                </div>
              </div>
              }
            </div>
            }

            <!-- Add Answer Form -->
            @if (canAddAnswer() && !showingAnswerForm().has(thread.question.id)) {
            <div class="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700">
              <button
                (click)="toggleAnswerForm(thread.question.id)"
                class="text-sm text-brand-primary-600 dark:text-brand-primary-400 hover:text-brand-primary-800 dark:hover:text-brand-primary-300 font-medium"
              >
                {{ "addAnswer" | i18n }}
              </button>
            </div>
            }

            @if (showingAnswerForm().has(thread.question.id)) {
            <div class="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700">
              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ "answerTitle" | i18n }}
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="newAnswerTitle"
                    [placeholder]="'answerTitlePlaceholder' | i18n"
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-brand-primary-500 focus:border-brand-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ "answerContent" | i18n }}
                  </label>
                  <textarea
                    [(ngModel)]="newAnswerContent"
                    rows="3"
                    [placeholder]="'answerContentPlaceholder' | i18n"
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-brand-primary-500 focus:border-brand-primary-500 sm:text-sm"
                  ></textarea>
                </div>
                <div class="flex justify-end space-x-2">
                  <button
                    (click)="cancelAnswer(thread.question.id)"
                    type="button"
                    class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    {{ "cancel" | i18n }}
                  </button>
                  <button
                    (click)="addAnswer(thread.question.id)"
                    [disabled]="!newAnswerTitle() || !newAnswerContent() || isSubmitting()"
                    type="button"
                    class="px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    @if (isSubmitting()) {
                    <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    }
                    {{ "addAnswer" | i18n }}
                  </button>
                </div>
              </div>
            </div>
            }
          </div>
          }
        </div>
        } @else {
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <i class="fas fa-question-circle text-4xl mb-3"></i>
          <p class="text-sm">{{ "noClarificationsYet" | i18n }}</p>
          @if (canAddQuestion()) {
          <p class="text-xs mt-1">{{ "addFirstQuestion" | i18n }}</p>
          }
        </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceClarificationsComponent {
  serviceRequest = input.required<ServiceRequest>();
  currentUser = input.required<User>();
  
  // Outputs para eventos
  clarificationAdded = output<void>();
  
  // Injeção de serviços
  private readonly dataService = inject(DataService);
  private readonly i18n = inject(I18nService);

  // Estados locais
  readonly newQuestionTitle = signal("");
  readonly newQuestionContent = signal("");
  readonly newAnswerTitle = signal("");
  readonly newAnswerContent = signal("");
  readonly isSubmitting = signal(false);
  readonly showingAnswerForm = signal(new Set<number>());

  // Computed properties
  readonly clarifications = computed(() => this.dataService.serviceClarifications());
  readonly clarificationThreads = computed(() => 
    this.dataService.getClarificationThreads(this.serviceRequest().id)
  );
  
  readonly unreadCount = computed(() => {
    const currentUserId = this.currentUser().id;
    return this.clarifications().filter(c => 
      c.service_request_id === this.serviceRequest().id &&
      c.user_id !== currentUserId && 
      !c.is_read
    ).length;
  });

  readonly canAddQuestion = computed(() => {
    const user = this.currentUser();
    const request = this.serviceRequest();
    return user.id === request.client_id || 
           user.id === request.professional_id || 
           user.role === "admin";
  });

  readonly canAddAnswer = computed(() => {
    const user = this.currentUser();
    const request = this.serviceRequest();
    return user.id === request.client_id || 
           user.id === request.professional_id || 
           user.role === "admin";
  });

  constructor() {
    // Effect para carregar esclarecimentos quando o componente inicializa
    effect(async () => {
      const request = this.serviceRequest();
      if (request?.id) {
        await this.dataService.fetchServiceClarifications(request.id);
        // Marcar como lidos quando visualizados
        await this.dataService.markClarificationsAsRead(request.id);
      }
    });
  }

  async addQuestion() {
    if (!this.newQuestionTitle() || !this.newQuestionContent()) return;
    
    this.isSubmitting.set(true);
    try {
      await this.dataService.addClarificationQuestion(
        this.serviceRequest().id,
        this.newQuestionTitle(),
        this.newQuestionContent()
      );
      
      this.clearQuestionForm();
      this.clarificationAdded.emit();
    } catch (error) {
      console.error("Error adding question:", error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async addAnswer(questionId: number) {
    if (!this.newAnswerTitle() || !this.newAnswerContent()) return;
    
    this.isSubmitting.set(true);
    try {
      await this.dataService.addClarificationAnswer(
        this.serviceRequest().id,
        questionId,
        this.newAnswerTitle(),
        this.newAnswerContent()
      );
      
      this.clearAnswerForm();
      this.hideAnswerForm(questionId);
      this.clarificationAdded.emit();
    } catch (error) {
      console.error("Error adding answer:", error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async deleteClarification(clarificationId: number) {
    if (!confirm(this.i18n.translate("confirmDeleteClarification"))) {
      return;
    }

    try {
      await this.dataService.deleteClarification(clarificationId, this.serviceRequest().id);
      this.clarificationAdded.emit();
    } catch (error) {
      console.error("Error deleting clarification:", error);
    }
  }

  toggleAnswerForm(questionId: number) {
    const current = this.showingAnswerForm();
    if (current.has(questionId)) {
      current.delete(questionId);
    } else {
      current.add(questionId);
    }
    this.showingAnswerForm.set(new Set(current));
  }

  hideAnswerForm(questionId: number) {
    const current = this.showingAnswerForm();
    current.delete(questionId);
    this.showingAnswerForm.set(new Set(current));
  }

  cancelAnswer(questionId: number) {
    this.clearAnswerForm();
    this.hideAnswerForm(questionId);
  }

  clearQuestionForm() {
    this.newQuestionTitle.set("");
    this.newQuestionContent.set("");
  }

  clearAnswerForm() {
    this.newAnswerTitle.set("");
    this.newAnswerContent.set("");
  }
}

