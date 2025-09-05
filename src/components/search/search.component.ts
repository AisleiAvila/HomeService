import { Component, ChangeDetectionStrategy, signal, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { User } from '../../models/maintenance.models';
import { ServiceListComponent } from '../service-list/service-list.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, ServiceListComponent],
  template: `
    <div class="container mx-auto p-4">
      <h1 class="text-3xl font-bold mb-6">Search Service Requests</h1>

      <div class="bg-white p-6 rounded-lg shadow-md mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Search Term -->
          <div>
            <label for="searchTerm" class="block text-sm font-medium text-gray-700">Search Term</label>
            <input 
              type="text" 
              id="searchTerm"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
              placeholder="e.g., leaky faucet, painting"
            >
          </div>
          <!-- Category Filter -->
          <div>
            <label for="category" class="block text-sm font-medium text-gray-700">Category</label>
            <select 
              id="category"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              [ngModel]="categoryFilter()"
              (ngModelChange)="categoryFilter.set($event)"
            >
              <option value="">All Categories</option>
              @for (category of categories(); track category) {
                <option [value]="category">{{ category }}</option>
              }
            </select>
          </div>
          <!-- Status Filter -->
          <div>
            <label for="status" class="block text-sm font-medium text-gray-700">Status</label>
            <select 
              id="status"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              [ngModel]="statusFilter()"
              (ngModelChange)="statusFilter.set($event)"
            >
              <option value="">All Statuses</option>
              @for (status of statuses; track status) {
                <option [value]="status">{{ status }}</option>
              }
            </select>
          </div>
        </div>
      </div>
      
      <h2 class="text-2xl font-semibold mb-4">Results ({{ filteredRequests().length }})</h2>

      @if (filteredRequests().length > 0) {
        <app-service-list [serviceRequests]="filteredRequests()" [currentUser]="user()"></app-service-list>
      } @else {
        <div class="text-center py-12 bg-white rounded-lg shadow-md">
          <p class="text-gray-500">No results found for your search criteria.</p>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  user = input.required<User>();
  private dataService = inject(DataService);

  allRequests = this.dataService.serviceRequests;
  categories = this.dataService.categories;
  statuses = ['Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];

  searchTerm = signal('');
  categoryFilter = signal('');
  statusFilter = signal('');

  filteredRequests = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const category = this.categoryFilter();
    const status = this.statusFilter();
    
    return this.allRequests().filter(request => {
      const termMatch = term ? 
        request.title.toLowerCase().includes(term) || 
        request.description.toLowerCase().includes(term) : true;
      
      const categoryMatch = category ? request.category === category : true;
      const statusMatch = status ? request.status === status : true;

      return termMatch && categoryMatch && statusMatch;
    });
  });
}
