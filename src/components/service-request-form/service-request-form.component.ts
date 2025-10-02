import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-service-request-form',
  templateUrl: './service-request-form.component.html'
})
export class ServiceRequestFormComponent {
  // Sinais para os campos do formulário
  title = signal<string>('');
  description = signal<string>('');
  category = signal<string>('');
  requestedDateTime = signal<string>('');
  street = signal<string>('');
  city = signal<string>('');
  state = signal<string>('');
  zip_code = signal<string>('');
  
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
    zip_code: false
  });

  // Validar e atualizar campos simples
  updateField(field: string, value: string | null | undefined) {
    if (value === null || value === undefined) {
      // Tratamento para valores nulos ou indefinidos
      return;
    }
    
    // Limpar mensagens de erro quando o usuário começa a corrigir o formulário
    this.formError.set(null);
    
    switch (field) {
      case 'title':
        this.title.set(value);
        this.validFields.update(fields => ({ ...fields, title: value.length >= 3 }));
        break;
      case 'description':
        this.description.set(value);
        this.validFields.update(fields => ({ ...fields, description: value.length >= 10 }));
        break;
      case 'category':
        this.category.set(value);
        this.validFields.update(fields => ({ ...fields, category: !!value }));
        break;
      case 'requestedDateTime':
        this.requestedDateTime.set(value);
        const isValid = !!value && new Date(value) > new Date();
        this.validFields.update(fields => ({ ...fields, requestedDateTime: isValid }));
        break;
      // Campos de endereço
      case 'street':
        this.street.set(value);
        this.validFields.update(fields => ({ ...fields, street: value.length >= 5 }));
        break;
      case 'city':
        this.city.set(value);
        this.validFields.update(fields => ({ ...fields, city: value.length >= 3 }));
        break;
      case 'state':
        this.state.set(value);
        this.validFields.update(fields => ({ ...fields, state: value.length === 2 }));
        break;
      case 'zip_code':
        this.zip_code.set(value);
        const isValidZip = this.isValidPostalCode(value);
        this.validFields.update(fields => ({ ...fields, zip_code: isValidZip }));
        break;
    }
  }
  
  // Método para validação específica de CEP brasileiro
  isValidPostalCode(postalCode: string): boolean {
    // Remove caracteres não numéricos
    const cleanedPostalCode = postalCode.replace(/\D/g, '');
    
    // Verifica se tem 8 dígitos (formato padrão do CEP brasileiro)
    if (cleanedPostalCode.length !== 8) {
      return false;
    }
    
    // Verifica se não é uma sequência de números iguais (ex: 00000000)
    if (/^(\d)\1+$/.test(cleanedPostalCode)) {
      return false;
    }
    
    return true;
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
