import { Component, ChangeDetectionStrategy, output, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, Address, ServiceCategory, ServiceRequest } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';
import { AddressAutocompleteService } from '../../services/address-autocomplete.service';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-service-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  template: `
    <div class="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto bg-gray-50">
      <div class="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">{{ 'newRequest' | i18n }}</h2>
        <form (ngSubmit)="handleSubmit()" #requestForm="ngForm">
          <div class="space-y-6">
            <!-- Title -->
            <div>
              <label for="title" class="block text-sm font-medium text-gray-700">{{ 'serviceTitle' | i18n }}</label>
              <input type="text" id="title" name="title" [ngModel]="title()" (ngModelChange)="title.set($event)" required
                     class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>

            <!-- Description -->
            <div>
              <label for="description" class="block text-sm font-medium text-gray-700">{{ 'detailedDescription' | i18n }}</label>
              <textarea id="description" name="description" rows="4" [ngModel]="description()" (ngModelChange)="description.set($event)" required
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
            </div>

            <!-- Category -->
            <div>
              <label for="category" class="block text-sm font-medium text-gray-700">{{ 'category' | i18n }}</label>
              <select id="category" name="category" [ngModel]="category()" (ngModelChange)="category.set($event)" required
                      class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                @for (cat of categories(); track cat) {
                  <option [value]="cat">{{ cat }}</option>
                }
              </select>
            </div>

            <!-- Address -->
            <div class="relative">
              <label for="address" class="block text-sm font-medium text-gray-700">{{ 'serviceAddress' | i18n }}</label>
              <input type="text" id="address" name="addressSearch" [ngModel]="addressSearch()" (ngModelChange)="addressSearch.set($event)" 
                     (focus)="onAddressFocus()" (blur)="showSuggestions.set(false)"
                     placeholder="{{ 'searchForAddress' | i18n }}" autocomplete="off"
                     class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              
              @if (showSuggestions() && addressSuggestions().length > 0) {
                <ul class="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-60 overflow-auto">
                  @for (suggestion of addressSuggestions(); track suggestion.street) {
                    <li (mousedown)="selectAddress(suggestion)" class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm">
                      {{ formatAddress(suggestion) }}
                    </li>
                  }
                </ul>
              }
            </div>

            <!-- Address details (read-only, populated by autocomplete) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <input type="hidden" name="street" [ngModel]="street()">
                <input type="hidden" name="city" [ngModel]="city()">
                <input type="hidden" name="state" [ngModel]="state()">
                <input type="hidden" name="zipCode" [ngModel]="zipCode()">
            </div>

            <!-- Requested Date -->
            <div>
              <label for="requestedDate" class="block text-sm font-medium text-gray-700">{{ 'preferredDate' | i18n }} ({{ 'optional' | i18n }})</label>
              <input type="date" id="requestedDate" name="requestedDate" [ngModel]="requestedDate()" (ngModelChange)="requestedDate.set($event)"
                     class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>

          </div>

          <!-- Actions -->
          <div class="mt-8 flex justify-end space-x-3">
            <button type="button" (click)="resetForm()"
                    class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              {{ 'reset' | i18n }}
            </button>
            <button type="submit" [disabled]="!isFormValid()"
                    class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed">
              {{ 'submitRequest' | i18n }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestFormComponent {
  submitRequest = output<void>();
  // For demo purposes, we'll find the first client to associate the request with.
  // In a real app, the current user would be passed in as an input.
  currentUser = inject(DataService).users().find(u => u.role === 'client')!;
  private dataService = inject(DataService);
  private addressService = inject(AddressAutocompleteService);

  title = signal('');
  description = signal('');
  category = signal<ServiceCategory>('General Repair');
  requestedDate = signal('');
  
  // Address fields
  street = signal('');
  city = signal('');
  state = signal('');
  zipCode = signal('');
  
  addressSearch = signal('');
  addressSuggestions = signal<Address[]>([]);
  showSuggestions = signal(false);
  
  categories = this.dataService.categories;

  isFormValid = computed(() => {
    return this.title().trim() && 
           this.description().trim() && 
           this.category() && 
           this.street().trim() && 
           this.city().trim() && 
           this.state().trim() && 
           this.zipCode().trim();
  });

  constructor() {
    effect(() => {
      const query = this.addressSearch();
      // Debounce logic can be added here if needed
      if (query.length > 2) {
        this.addressService.getSuggestions(query).then(suggestions => {
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
    this.street.set(address.street);
    this.city.set(address.city);
    this.state.set(address.state);
    this.zipCode.set(address.zipCode);
    this.addressSearch.set(this.formatAddress(address));
    this.showSuggestions.set(false);
  }

  formatAddress(address: Address): string {
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
  }

  onAddressFocus() {
    if (this.addressSuggestions().length > 0) {
      this.showSuggestions.set(true);
    }
  }

  handleSubmit() {
    if (!this.isFormValid()) return;
    
    const newRequestData: Omit<ServiceRequest, 'id' | 'status' | 'professionalId' | 'scheduledDate' | 'cost' | 'paymentStatus'> = {
      clientId: this.currentUser.id,
      title: this.title(),
      description: this.description(),
      category: this.category(),
      address: {
        street: this.street(),
        city: this.city(),
        state: this.state(),
        zipCode: this.zipCode()
      },
      requestedDate: this.requestedDate() ? new Date(this.requestedDate()) : new Date(),
    };
    
    this.dataService.addServiceRequest(newRequestData);
    this.submitRequest.emit();
    this.resetForm();
  }

  resetForm() {
    this.title.set('');
    this.description.set('');
    this.category.set('General Repair');
    this.requestedDate.set('');
    this.street.set('');
    this.city.set('');
    this.state.set('');
    this.zipCode.set('');
    this.addressSearch.set('');
  }
}
