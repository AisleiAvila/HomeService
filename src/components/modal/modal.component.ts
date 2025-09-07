import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-modal",
  standalone: true,
  imports: [CommonModule, I18nPipe],
  templateUrl: "./modal.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  title = input<string>("");
  message = input<string>("");
  isVisible = input<boolean>(false);
  closed = output<void>();

  close() {
    this.closed.emit();
  }
}
