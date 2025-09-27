import { Pipe, PipeTransform, inject } from "@angular/core";
import { I18nService } from "../i18n.service";

@Pipe({
  name: "i18n",
  standalone: true,
  pure: false, // To re-evaluate when language changes, as it depends on service state
})
export class I18nPipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: string, params?: Record<string, string | number>): string {
    // Força a reatividade usando o signal da linguagem
    const currentLang = this.i18n.language();

    const result = this.i18n.translate(key, params);

    return result;
  }
}
