
import { Component, ChangeDetectionStrategy, input, output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { User, Address, ServiceCategory } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';
import { AddressAutocompleteService } from '../../services/address-autocomplete.service';
import { I18nPipe } from '../../pipes/i18n.pipe';

export interface ServiceRequestPayload {
  client_id: number;
  title: string;
  description: string;
  category: ServiceCategory;
  street: string;
  city: string;
  state: string;
  zip_code: string;
}

@Component({
  selector: 'app-service-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, I18nPipe],
  templateUrl: './service-request-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestFormComponent {
  user = input.required<User>();
  formSubmitted = output<ServiceRequestPayload>();
  close = output<void>();

  private fb = inject(FormBuilder);
  private dataService = inject(DataService);
  private addressService = inject(AddressAutocompleteService);

  categories = this.dataService.categories;
  addressSuggestions = signal<Address[]>([]);
  showSuggestions = signal(false);

  requestForm = this.fb.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    category: ['', Validators.required],
    street: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    zip_code: ['', Validators.required],
  });

  constructor() {
    this.requestForm.controls.street.valueChanges.subscribe(value => {
      if (value && value.length > 2) {
        this.addressService.getSuggestions(value).then(suggestions => {
          this.addressSuggestions.set(suggestions);
          this.showSuggestions.set(true);
        });
      } else {
        this.addressSuggestions.set([]);
        this.showSuggestions.set(false);
      }
    });
  }
  
  selectAddress(address: Address) {
    this.requestForm.patchValue({
      street: address.street,
      city: address.city,
      state: address.state,
      zip_code: address.zip_code,
    });
    this.addressSuggestions.set([]);
    this.showSuggestions.set(false);
  }

  submitForm() {
    if (this.requestForm.valid) {
      const formValue = this.requestForm.getRawValue();
      const payload: ServiceRequestPayload = {
        client_id: this.user().id,
        title: formValue.title!,
        description: formValue.description!,
        category: formValue.category!,
        street: formValue.street!,
        city: formValue.city!,
        state: formValue.state!,
        zip_code: formValue.zip_code!,
      };
      this.formSubmitted.emit(payload);
    }
  }
}
