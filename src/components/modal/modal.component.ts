import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
} from "@angular/core";

import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-modal",
  standalone: true,
  imports: [I18nPipe],
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

