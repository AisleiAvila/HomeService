import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  inject,
  AfterViewChecked,
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
export class PaymentModalComponent implements AfterViewChecked {
  request = input.required<ServiceRequest>();
  show = input<boolean>(false);
  // Controls disabled state and spinner until parent completes payment
  loading = input<boolean>(false);
  // Estado local de spinner
  processing = signal<boolean>(false);
  onPay = output<{ request: ServiceRequest; method: string }>();
  onClose = output<void>();

  // Estado de erro/feedback
  error = signal<string>("");

  // Ref para o elemento do modal
  modalRef?: HTMLDialogElement;

  private readonly i18n = inject(I18nService);

  selectedMethod = signal<string>("");

  paymentMethods = [
    {
      id: "card",
      label: this.i18n.translate("creditCard"),
      tooltip: this.i18n.translate("creditCardTooltip") || "Pagamento com cartão de crédito ou débito."
    },
    {
      id: "mbway",
      label: this.i18n.translate("mbway"),
      tooltip: this.i18n.translate("mbwayTooltip") || "Pagamento instantâneo via MB WAY."
    },
    {
      id: "bank",
      label: this.i18n.translate("bankTransfer"),
      tooltip: this.i18n.translate("bankTransferTooltip") || "Transferência bancária tradicional."
    },
  ];

  handlePay() {
    if (this.loading()) return;
    this.error.set("");
    if (!this.selectedMethod()) {
      this.error.set(this.i18n.translate("selectPaymentMethodError") || "Selecione um método de pagamento.");
      return;
    }
    // Ativa spinner local
    this.processing.set(true);
    // Emite evento para o pai processar pagamento
    this.onPay.emit({
      request: this.request(),
      method: this.selectedMethod(),
    });

  }

  // Método para ser chamado pelo pai em caso de erro
  showError(msg: string) {
    this.error.set(msg);
    this.processing.set(false);
  }

  // Fecha modal ao pressionar ESC
  onModalKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && !this.loading()) {
      this.handleClose();
    }
  }

  // Move foco para o modal ao abrir
  ngAfterViewChecked() {
    if (this.show() && this.modalRef) {
      this.modalRef.focus();
    }
  }

  handleClose() {
    if (this.loading()) return;
    this.error.set("");
    this.processing.set(false);
    this.onClose.emit();
  }
}
