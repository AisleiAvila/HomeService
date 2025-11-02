import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ServiceRequest } from "../../models/maintenance.models";
import { WorkflowService } from "../../services/workflow.service";
import { I18nService } from "../../i18n.service";
import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-clarification-modal",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./clarification-modal.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClarificationModalComponent {
  isVisible = input.required<boolean>();
  serviceRequest = input.required<ServiceRequest>();
  close = output<void>();

  private readonly workflowService = inject(WorkflowService);
  private readonly i18n = inject(I18nService);

  clarificationText = signal("");
  isSubmitting = signal(false);

  async submitClarification() {
    const text = this.clarificationText().trim();
    if (!text) return;

    this.isSubmitting.set(true);

    try {
      await this.workflowService.provideClarification(
        this.serviceRequest().id,
        text
      );

      this.clarificationText.set("");
      this.close.emit();
    } catch (error) {
      console.error("Erro ao enviar esclarecimentos:", error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onClose() {
    this.clarificationText.set("");
    this.close.emit();
  }
}
