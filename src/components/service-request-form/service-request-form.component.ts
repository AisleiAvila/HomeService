import { Component, ChangeDetectionStrategy, inject, signal, output, computed, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AddressAutocompleteService } from '../../services/address-autocomplete.service';
import { User, ServiceCategory, Address } from '../../models/maintenance.models';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-service-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  template: `
    <div class="p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl mx-auto">
      <form (ngSubmit)="submitRequest()" #requestForm="ngForm">
        <div class="space-y-6">
          <div>
            <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ 'serviceTitle' | i18n }}</label>
            <input type="text" id="title" name="title" [ngModel]="title()" (ngModelChange)="title.set($event)" required
                  class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ 'detailedDescription' | i18n }}</label>
            <textarea id="description" name="description" rows="4" [ngModel]="description()" (ngModelChange)="description.set($event)" required
                      class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"></textarea>
          </div>

          <div>
            <label for="category" class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ 'category' | i18n }}</label>
            <select id="category" name="category" [ngModel]="category()" (ngModelChange)="category.set($event)" required
                    class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="" disabled>{{ 'selectACategory' | i18n }}</option>
              @for (cat of categories(); track cat) {
                <option [value]="cat">{{ cat }}</option>
              }
            </select>
          </div>

          <div class="relative">
            <label for="address" class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ 'serviceAddress' | i18n }}</label>
            @if (selectedAddress()) {
              <div class="mt-1 flex items-center justify-between p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700">
                <span class="text-sm text-gray-800 dark:text-gray-200">{{ formatAddress(selectedAddress()!) }}</span>
                <button type="button" (click)="resetAddress()" class="text-red-500 hover:text-red-700">
                  <i class="fas fa-times-circle"></i>
                </button>
              </div>
            } @else {
              <input type="text" id="address" name="address" [ngModel]="addressSearch()" (ngModelChange)="addressSearch.set($event)"
                    placeholder="{{ 'searchForAddress' | i18n }}" required autocomplete="off"
                    class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              @if (showSuggestions() && addressSuggestions().length > 0) {
                <ul class="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
                  @for (suggestion of addressSuggestions(); track suggestion) {
                    <li (click)="selectAddress(suggestion)" class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-2 text-sm text-gray-800 dark:text-gray-200">
                      {{ formatAddress(suggestion) }}
                    </li>
                  }
                </ul>
              }
            }
          </div>

          <div>
            <label for="requestedDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ 'preferredDate' | i18n }} <span class="text-gray-500">({{ 'optional' | i18n }})</span></label>
            <input type="date" id="requestedDate" name="requestedDate" [ngModel]="requestedDate()" (ngModelChange)="requestedDate.set($event)"
                  class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
          </div>
        </div>

        <div class="mt-8 flex justify-end space-x-3">
          <button type="button" (click)="resetForm()"
                  class="bg-white dark:bg-gray-600 py-2 px-4 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            {{ 'reset' | i18n }}
          </button>
          <button type="submit" [disabled]="!isFormValid()"
                  [class.opacity-50]="!isFormValid()"
                  class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            {{ 'submitRequest' | i18n }}
          </button>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestFormComponent {
  private dataService = inject(DataService);
  private addressService = inject(AddressAutocompleteService);

  currentUser = input.required<User>();
  formSubmitted = output<void>();

  // Form state
  title = signal('');
  description = signal('');
  category = signal<ServiceCategory>('');
  addressSearch = signal('');
  selectedAddress = signal<Address | null>(null);
  addressSuggestions = signal<Address[]>([]);
  showSuggestions = signal(false);
  requestedDate = signal('');

  categories = this.dataService.categories;

  isFormValid = computed(() => {
    return this.title().trim() &&
           this.description().trim() &&
           this.category() &&
           this.selectedAddress();
  });

  private debounceTimer?: number;

  constructor() {
    effect(() => {
        const query = this.addressSearch();
        
        if (query && this.addressSearch() !== this.formatAddress(this.selectedAddress())) {
            if(this.selectedAddress()) {
              this.selectedAddress.set(null);
            }
            window.clearTimeout(this.debounceTimer);
            this.debounceTimer = window.setTimeout(async () => {
              const suggestions = await this.addressService.getSuggestions(query);
              this.addressSuggestions.set(suggestions);
              this.showSuggestions.set(true);
            }, 300);
          } else {
            this.addressSuggestions.set([]);
            this.showSuggestions.set(false);
          }
    });
  }

  selectAddress(address: Address) {
    this.selectedAddress.set(address);
    this.addressSearch.set(this.formatAddress(address));
    this.showSuggestions.set(false);
  }

  resetAddress() {
      this.selectedAddress.set(null);
      this.addressSearch.set('');
  }

  submitRequest() {
    if (!this.isFormValid()) return;

    this.dataService.addServiceRequest({
      clientId: this.currentUser()!.id,
      title: this.title(),
      description: this.description(),
      category: this.category(),
      address: this.selectedAddress()!,
      requestedDate: this.requestedDate() ? new Date(this.requestedDate()) : new Date(),
    });
    
    this.resetForm();
    this.formSubmitted.emit();
  }

  resetForm() {
    this.title.set('');
    this.description.set('');
    this.category.set('');
    this.addressSearch.set('');
    this.selectedAddress.set(null);
    this.requestedDate.set('');
  }

  formatAddress(address: Address | null): string {
    if (!address) return '';
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
  }
}
