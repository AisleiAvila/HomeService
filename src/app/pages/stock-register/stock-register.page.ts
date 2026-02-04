import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { StockIntakeComponent } from "../../../components/admin-dashboard/stock-intake/stock-intake.component";

@Component({
  selector: "app-stock-register-page",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe, StockIntakeComponent],
  template: `
    <div class="container mx-auto p-4">
      <app-stock-intake />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockRegisterPage {}
