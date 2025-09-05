import { Component, ChangeDetectionStrategy, input, output, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, Address, ServiceCategory, ServiceRequestPayload } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';
import { AddressAutocompleteService } from '../../services/address-autocomplete.service';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-service-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  template: `
<div class="p-6 bg-white rounded-lg relative max-h-full overflow-y-auto">
  <button (click)="close.emit()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
    <i class="fas fa-times text-xl"></i>
  </button>
  <h2 class="text-2xl font-bold text-gray-800 mb-6">New Service Request</h2>
  <form (ngSubmit)="submitForm()" class="space-y-4">
    <div>
      <label for="title" class="block text-sm font-medium text-gray-700">Title</label>
      <input id="title" type="text" [(ngModel)]="title" name="title" required
             class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
    </div>

    <div>
      <label for="category" class="block text-sm font-medium text-gray-700">Category</label>
      <select id="category" [(ngModel)]="category" name="category" required
              class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
        <option value="" disabled>Select a category...</option>
        @for(cat of categories(); track cat) {
          <option [value]="cat">{{ cat }}</option>
        }
      </select>
    </div>
    
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
      <textarea id="description" rows="4" [(ngModel)]="description" name="description" required
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
    </div>
    
    <div class="relative">
      <label for="street" class="block text-sm font-medium text-gray-700">Street Address</label>
      <input id="street" type="text" [ngModel]="addressQuery()" (ngModelChange)="updateStreet($event)" name="street" required
             autocomplete="off"
             (focus)="showSuggestions.set(true)"
             (blur)="onAddressBlur()"
             class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
      @if (showSuggestions() && addressSuggestions().length > 0) {
        <ul class="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-60 overflow-auto">
          @for(suggestion of addressSuggestions(); track suggestion.street) {
            <li (click)="selectAddress(suggestion)" class="px-4 py-2 cursor-pointer hover:bg-gray-100">
              {{ suggestion.street }}, {{ suggestion.city }}
            </li>
          }
        </ul>
      }
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label for="city" class="block text-sm font-medium text-gray-700">City</label>
        <input id="city" type="text" [ngModel]="address().city" (ngModelChange)="updateAddressField('city', $event)" name="city" required
               class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
      </div>
      <div>
        <label for="state" class="block text-sm font-medium text-gray-700">State</label>
        <input id="state" type="text" [ngModel]="address().state" (ngModelChange)="updateAddressField('state', $event)" name="state" required
               class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
      </div>
      <div>
        <label for="zip" class="block text-sm font-medium text-gray-700">ZIP Code</label>
        <input id="zip" type="text" [ngModel]="address().zip_code" (ngModelChange)="updateAddressField('zip_code', $event)" name="zip_code" required
               class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
      </div>
    </div>
    
    <div class="pt-4 flex justify-end space-x-3">
      <button type="button" (click)="close.emit()"
              class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        {{ 'cancel' | i18n }}
      </button>
      <button type="submit" [disabled]="!canSubmit()"
              class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed">
        Submit Request
      </button>
    </div>
  </form>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestFormComponent {
  user = input.required<User>();
  close = output<void>();
  formSubmitted = output<ServiceRequestPayload>();

  private dataService = inject(DataService);
  private addressService = inject(AddressAutocompleteService);

  // Form state signals
  title = signal('');
  description = signal('');
  category = signal<ServiceCategory>('');
  address = signal<Address>({ street: '', city: '', state: '', zip_code: '' });
  
  // Autocomplete state
  addressQuery = signal('');
  addressSuggestions = signal<Address[]>([]);
  showSuggestions = signal(false);

  categories = this.dataService.categories;

  canSubmit = computed(() => {
    return this.title().trim() &&
           this.description().trim() &&
           this.category() &&
           this.address().street.trim() &&
           this.address().city.trim() &&
           this.address().state.trim() &&
           this.address().zip_code.trim();
  });

  constructor() {
    effect(() => {
      const userAddress = this.user().address;
      if (userAddress) {
        this.address.set({...userAddress});
        this.addressQuery.set(userAddress.street);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const query = this.addressQuery();
      if (query.length > 2) {
        this.addressService.getSuggestions(query).then(suggestions => {
          this.addressSuggestions.set(suggestions);
          this.showSuggestions.set(suggestions.length > 0);
        });
      } else {
        this.addressSuggestions.set([]);
        this.showSuggestions.set(false);
      }
    });
  }
  
  updateStreet(street: string) {
      this.addressQuery.set(street);
      this.address.update(a => ({...a, street}));
  }

  selectAddress(selectedAddress: Address) {
    this.address.set(selectedAddress);
    this.addressQuery.set(selectedAddress.street);
    this.showSuggestions.set(false);
  }

  submitForm() {
    if (!this.canSubmit()) return;

    this.formSubmitted.emit({
      title: this.title(),
      description: this.description(),
      category: this.category(),
      address: this.address(),
      requested_date: new Date().toISOString(),
    });
  }

  onAddressBlur() {
    // Use setTimeout to allow click event on suggestions to fire before hiding
    setTimeout(() => this.showSuggestions.set(false), 200);
  }

  updateAddressField(field: keyof Address, value: string) {
    this.address.update(current => ({...current, [field]: value}));
  }
}