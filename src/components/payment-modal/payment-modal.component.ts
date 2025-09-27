import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ServiceRequest } from "../../models/maintenance.models";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { I18nService } from "../../i18n.service";

@Component({
  selector: "app-payment-modal",
  standalone: true,
  imports: [CommonModule, I18nPipe],
  templateUrl: "./payment-modal.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentModalComponent {
  request = input.required<ServiceRequest>();
  show = input<boolean>(false);
  onPay = output<{ request: ServiceRequest; method: string }>();
  onClose = output<void>();

  private i18n = inject(I18nService);

  selectedMethod = signal<string>("");

  paymentMethods = [
    { id: "card", label: this.i18n.translate("creditCard") },
    { id: "mbway", label: this.i18n.translate("mbway") },
    { id: "bank", label: this.i18n.translate("bankTransfer") },
  ];

  handlePay() {
    if (this.selectedMethod()) {
      this.onPay.emit({
        request: this.request(),
        method: this.selectedMethod(),
      });
    }
  }

  handleClose() {
    this.onClose.emit();
  }
}
