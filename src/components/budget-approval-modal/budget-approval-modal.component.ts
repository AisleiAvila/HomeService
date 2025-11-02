import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ServiceRequest, User } from "../../models/maintenance.models";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { I18nService } from "../../i18n.service";

@Component({
  selector: "app-budget-approval-modal",
  standalone: true,
  imports: [CommonModule, I18nPipe],
  templateUrl: "./budget-approval-modal.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetApprovalModalComponent {
  request = input.required<ServiceRequest>();
  user = input.required<User>();
  show = input<boolean>(false);
  // Controls disabled state and spinners while parent processes the action
  loading = input<boolean>(false);
  approve = output<ServiceRequest>();
  reject = output<ServiceRequest>();
  close = output<void>();

  private i18n = inject(I18nService);
  selectedLanguage = signal(this.i18n.language());

  setLanguage(lang: "en" | "pt") {
    this.selectedLanguage.set(lang);
    this.i18n.setLanguage(lang);
  }

  handleApprove() {
    if (this.loading()) return;
    this.approve.emit(this.request());
    this.close.emit();
  }

  handleReject() {
    if (this.loading()) return;
    this.reject.emit(this.request());
    this.close.emit();
  }

  handleClose() {
    if (this.loading()) return;
    this.close.emit();
  }
}
