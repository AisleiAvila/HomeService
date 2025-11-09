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
import { I18nService } from "@/src/i18n.service";
import { I18nPipe } from "@/src/pipes/i18n.pipe";
import type { ServiceSubcategory } from "../../models/maintenance.models";

@Component({
  selector: "app-service-request-form",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./service-request-form.component.html",
})
export class ServiceRequestFormComponent implements OnInit {
  // Propriedade para controlar se o campo foi tocado/interagido
  touched: {
    title: boolean;
    description: boolean;
    requestedDateTime: boolean;
    zip_code: boolean;
    number: boolean;
    client_name: boolean;
    client_phone: boolean;
    client_nif: boolean;
  } = {
    title: false,
    description: false,
    requestedDateTime: false,
    zip_code: false,
    number: false,
    client_name: false,
    client_phone: false,
    client_nif: false,
  };
  // Sinal para estado de submissão
  isSubmitting = signal<boolean>(false);
  // Corrige erro: método para formatar zip_code ao colar
  onZipCodePaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData("text") || "";
    let digits = pasted.replace(/\D/g, "");
    let formatted = digits;
    if (digits.length > 4) {
      formatted = digits.slice(0, 4) + "-" + digits.slice(4, 7);
    }
    if (formatted.length > 8) {
      formatted = formatted.slice(0, 8);
    }
    this.updateField("zip_code", formatted);
  }
  @Output() close = new EventEmitter<void>();
  private readonly dataService = inject(DataService);
  private readonly i18n = inject(I18nService);

  // Usar signals diretamente do DataService
  categories = this.dataService.categories;
  subcategories = signal<ServiceSubcategory[]>([]);
  subcategory_id = signal<number | null>(null);

  title = signal<string>("");
  description = signal<string>("");
  requestedDateTime = signal<string>("");
  priority = signal<string>("");
  
  // Signals para informações do solicitante
  client_name = signal<string>("");
  client_phone = signal<string>("");
  client_nif = signal<string>("");
  
  ngOnInit() {
    console.log('=== ServiceRequestForm ngOnInit ===');
    console.log('Categories:', this.categories());
    console.log('Categories length:', this.categories().length);
  }

  onCategoryChange(value: string) {
    console.log('=== onCategoryChange called ===');
    console.log('Value received:', value);
    
    const categoryId = value ? Number(value) : null;
    this.category_id.set(categoryId);
    
    // Buscar subcategorias da categoria selecionada
    if (categoryId) {
      const selectedCategory = this.categories().find(c => c.id === categoryId);
      console.log('Selected category:', selectedCategory);
      this.subcategories.set(selectedCategory?.subcategories || []);
      console.log('Subcategories set to:', this.subcategories().length);
    } else {
      this.subcategories.set([]);
    }
    
    // Reset subcategoria
    this.subcategory_id.set(null);
    this.validFields.update((fields) => ({
      ...fields,
      category_id: !!categoryId,
      subcategory_id: false,
    }));
  }

  category_id = signal<number | null>(null);
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
    category_id: boolean;
    subcategory_id: boolean;
    requestedDateTime: boolean;
    priority: boolean;
    street: boolean;
    city: boolean;
    state: boolean;
    zip_code: boolean;
    number: boolean;
    client_name: boolean;
    client_phone: boolean;
    client_nif: boolean;
  }>({
    title: false,
    description: false,
    category_id: false,
    subcategory_id: false,
    requestedDateTime: false,
    priority: false,
    street: false,
    city: false,
    state: false,
    zip_code: false,
    number: false,
    client_name: false,
    client_phone: false,
    client_nif: true, // NIF é opcional, então inicia como válido
  });

  // Método para verificar se o formulário está válido
  isFormValid(): boolean {
    const fields = this.validFields();
    return (
      fields.title &&
      fields.description &&
      fields.category_id &&
      fields.subcategory_id &&
      fields.requestedDateTime &&
      fields.priority &&
      fields.street &&
      fields.city &&
      fields.state &&
      fields.zip_code &&
      fields.client_name &&
      fields.client_phone &&
      fields.client_nif // NIF sempre válido (opcional)
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
      case "category_id":
        // Não deve chegar aqui, onCategoryChange é chamado diretamente
        console.log('=== updateField category_id (legacy) ===');
        const numValue = value ? Number(value) : null;
        this.category_id.set(numValue);
        this.subcategory_id.set(null);
        this.validFields.update((fields) => ({
          ...fields,
          category_id: !!value,
          subcategory_id: false,
        }));
        break;
      case "subcategory_id":
        this.subcategory_id.set(value ? Number(value) : null);
        this.validFields.update((fields) => ({
          ...fields,
          subcategory_id: !!value,
        }));
        break;
      case "requestedDateTime":
        this.requestedDateTime.set(value);
        const isValid = !!value && new Date(value) > new Date();
        this.validFields.update((fields) => ({
          ...fields,
          requestedDateTime: isValid,
        }));
        break;
      case "priority":
        this.priority.set(value);
        this.validFields.update((fields) => ({
          ...fields,
          priority: !!value && (value === "Normal" || value === "Urgent"),
        }));
        break;
      case "zip_code":
        // Auto-format zip code: insert hyphen after 4 digits if not present
        let formatted = value.replace(/\D/g, "");
        if (formatted.length > 4) {
          formatted = formatted.slice(0, 4) + "-" + formatted.slice(4, 7);
        }
        if (formatted.length > 8) {
          formatted = formatted.slice(0, 8);
        }
        this.zip_code.set(formatted);
        const isValidZip = this.isValidPostalCode(formatted);
        this.validFields.update((fields) => ({
          ...fields,
          zip_code: isValidZip,
        }));
        if (isValidZip) {
          // Consultar tabela codigos_postais
          const result = await this.dataService.getPostalCodeInfo(formatted);
          if (result) {
            this.locality.set(result.localidade || "");
            this.district.set(result.distrito || "");
            this.county.set(result.concelho || "");
            this.street.set(result.arteria_completa || "");
            // Validar campos automáticos
            this.validFields.update((fields) => ({
              ...fields,
              street: !!result.arteria_completa,
              city: !!result.concelho,
              state: !!result.distrito,
            }));
          } else {
            this.locality.set("");
            this.district.set("");
            this.county.set("");
            this.street.set("");
            this.validFields.update((fields) => ({
              ...fields,
              street: false,
              city: false,
              state: false,
            }));
            this.formError.set("Código postal não encontrado.");
          }
        } else {
          this.locality.set("");
          this.district.set("");
          this.county.set("");
          this.street.set("");
          this.validFields.update((fields) => ({
            ...fields,
            street: false,
            city: false,
            state: false,
          }));
        }
        break;
      case "number":
        this.number.set(value);
        this.validFields.update((fields) => ({
          ...fields,
          number: !!value && value.length > 0,
        }));
        break;
      case "complement":
        this.complement.set(value);
        break;
      case "client_name":
        this.client_name.set(value);
        this.validFields.update((fields) => ({
          ...fields,
          client_name: value.length >= 3,
        }));
        break;
      case "client_phone":
        this.client_phone.set(value);
        // Validar telefone português (9 dígitos)
        const isValidPhone = /^[0-9]{9}$/.test(value);
        this.validFields.update((fields) => ({
          ...fields,
          client_phone: isValidPhone,
        }));
        break;
      case "client_nif":
        this.client_nif.set(value);
        // NIF é opcional, mas se preenchido deve ter 9 dígitos
        const isValidNIF = !value || /^[0-9]{9}$/.test(value);
        this.validFields.update((fields) => ({
          ...fields,
          client_nif: isValidNIF,
        }));
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
  // Chamada ao serviço para criar solicitação de serviço
  async onSubmit() {
    this.isSubmitting.set(true);
    console.log("onSubmit chamado", {
      title: this.title(),
      description: this.description(),
      // category removido, agora usamos category_id
      // requestedDateTime removido, agora usamos requested_datetime
      street: this.street(),
      number: this.number(),
      complement: this.complement(),
      zip_code: this.zip_code(),
      locality: this.locality(),
      district: this.district(),
      county: this.county(),
    });
    if (!this.isFormValid()) {
      this.formError.set(this.i18n.translate("formErrorGeneric"));
      this.isSubmitting.set(false);
      return;
    }
    try {
      // Normaliza zip_code para formato XXXX-XXX
      let zip = this.zip_code();
      const digitsOnly = zip.replace(/\D/g, "");
      if (digitsOnly.length === 7) {
        zip = digitsOnly.slice(0, 4) + "-" + digitsOnly.slice(4);
      }
      const address = {
        street: this.street(),
        city: this.locality(),
        state: this.district(),
        zip_code: zip,
        concelho: this.county(),
        freguesia: undefined,
      };
      const payload = {
        title: this.title(),
        description: this.description(),
        category_id: this.category_id(),
        subcategory_id: this.subcategory_id(),
        address,
        requested_datetime: this.requestedDateTime(),
      };
      await this.dataService.addServiceRequest(payload);
      this.showSuccessMessage(this.i18n.translate("formSuccessGeneric"));
      // Opcional: resetar campos ou fechar modal
      this.close.emit();
      this.isSubmitting.set(false);
    } catch (error) {
      console.error("Erro ao enviar solicitação de serviço:", error);
      this.formError.set(
        this.i18n.translate("formErrorGeneric") +
          (error?.message ? ` (${error.message})` : "")
      );
      this.isSubmitting.set(false);
    }
  }
}
