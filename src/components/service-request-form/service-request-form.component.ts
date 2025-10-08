import {
  Component,
  signal,
  Output,
  EventEmitter,
  inject,
  OnInit,
} from "@angular/core";

import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { DataService } from "../../services/data.service";
@Component({
  selector: "app-service-request-form",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./service-request-form.component.html",
})
export class ServiceRequestFormComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  private dataService = inject(DataService);

  categories = signal<string[]>([]);
  // Sinais para os campos do formulário
  title = signal<string>("");
  description = signal<string>("");
  category = signal<string>("");
  ngOnInit() {
    // Busca categorias do DataService (signal)
    const cats = this.dataService.categories();
    // Se ServiceCategory for objeto, mapeie para string
    this.categories.set(
      cats.map((c: any) => (typeof c === "string" ? c : c.name || String(c)))
    );
  }
  requestedDateTime = signal<string>("");
  street = signal<string>("");
  city = signal<string>("");
  state = signal<string>("");
  zip_code = signal<string>("");
  number = signal<string>("");
  complement = signal<string>("");
  locality = signal<string>("");
  district = signal<string>("");
  county = signal<string>("");

  // Sinais para feedback visual
  formError = signal<string | null>(null);
  formSuccess = signal<string | null>(null);

  // Sinal para controlar a validade dos campos
  validFields = signal<{
    title: boolean;
    description: boolean;
    category: boolean;
    requestedDateTime: boolean;
    street: boolean;
    city: boolean;
    state: boolean;
    zip_code: boolean;
  }>({
    title: false,
    description: false,
    category: false,
    requestedDateTime: false,
    street: false,
    city: false,
    state: false,
    zip_code: false,
  });

  // Método para verificar se o formulário está válido
  isFormValid(): boolean {
    const fields = this.validFields();
    return (
      fields.title &&
      fields.description &&
      fields.category &&
      fields.requestedDateTime &&
      fields.street &&
      fields.city &&
      fields.state &&
      fields.zip_code
    );
  }

  // Validar e atualizar campos simples
  async updateField(field: string, value: string | null | undefined) {
    if (value === null || value === undefined) {
      return;
    }
    this.formError.set(null);
    switch (field) {
      case "title":
        this.title.set(value);
        this.validFields.update((fields) => ({
          ...fields,
          title: value.length >= 3,
        }));
        break;
      case "description":
        this.description.set(value);
        this.validFields.update((fields) => ({
          ...fields,
          description: value.length >= 10,
        }));
        break;
      case "category":
        this.category.set(value);
        this.validFields.update((fields) => ({ ...fields, category: !!value }));
        break;
      case "requestedDateTime":
        this.requestedDateTime.set(value);
        const isValid = !!value && new Date(value) > new Date();
        this.validFields.update((fields) => ({
          ...fields,
          requestedDateTime: isValid,
        }));
        break;
      case "zip_code":
        this.zip_code.set(value);
        const isValidZip = this.isValidPostalCode(value);
        this.validFields.update((fields) => ({
          ...fields,
          zip_code: isValidZip,
        }));
        if (isValidZip) {
          // Consultar tabela codigos_postais
          const result = await this.dataService.getPostalCodeInfo(value);
          if (result) {
            this.locality.set(result.localidade || "");
            this.district.set(result.distrito || "");
            this.county.set(result.concelho || "");
          } else {
            this.locality.set("");
            this.district.set("");
            this.county.set("");
            this.formError.set("Código postal não encontrado.");
          }
        } else {
          this.locality.set("");
          this.district.set("");
          this.county.set("");
        }
        break;
      case "number":
        this.number.set(value);
        break;
      case "complement":
        this.complement.set(value);
        break;
    }
  }

  // Método para validação de código postal português
  isValidPostalCode(postalCode: string): boolean {
    // Aceita formato 'XXXX-XXX' ou apenas dígitos (7 caracteres)
    const regex = /^\d{4}-\d{3}$/;
    const digitsOnly = postalCode.replace(/\D/g, "");
    // Aceita 'XXXX-XXX' ou 'XXXXXXX'
    if (regex.test(postalCode)) {
      return true;
    }
    if (digitsOnly.length === 7) {
      return true;
    }
    return false;
  }

  // Método para exibir mensagem de sucesso com temporizador para remoção
  showSuccessMessage(message: string, duration: number = 5000): void {
    this.formSuccess.set(message);

    // Remover a mensagem de sucesso após o período especificado
    setTimeout(() => {
      this.formSuccess.set(null);
    }, duration);
  }
}
