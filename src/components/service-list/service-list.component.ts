import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceRequest, User, Address } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <ul class="divide-y divide-gray-200">
        @if (serviceRequests().length === 0) {
          <li class="p-6 text-center text-gray-500">No service requests found.</li>
        } @else {
          @for (request of serviceRequests(); track request.id) {
            <li class="p-4 hover:bg-gray-50 transition-colors">
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-blue-600">{{ request.category }}</p>
                  <h4 class="text-lg font-bold text-gray-800 truncate">{{ request.title }}</h4>
                  <p class="text-sm text-gray-500 mt-1">{{ formatAddress(request.address) }}</p>
                  @if(request.status === 'Quoted' && request.cost) {
                    <p class="text-sm font-medium text-green-600">Quote: $ {{ request.cost.toFixed(2) }}</p>
                  }
                </div>
                <div class="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0 flex flex-col items-start sm:items-end space-y-2">
                  <span [class]="statusClass(request.status)">
                    {{ request.status }}
                    @if(request.paymentStatus === 'Paid') {
                      <span class="ml-2 font-bold text-green-700">(Paid)</span>
                    }
                  </span>
                  <div class="flex space-x-2 mt-2">
                    <!-- Client Actions -->
                    @if(currentUser().role === 'client') {
                       @if(request.status === 'Quoted') {
                         <button (click)="approveQuote.emit(request)" class="px-3 py-1 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600">Approve</button>
                         <button (click)="rejectQuote.emit(request)" class="px-3 py-1 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600">Reject</button>
                       }
                       @if(request.status === 'Completed' && request.paymentStatus === 'Unpaid') {
                         <button (click)="payNow.emit(request)" class="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Pay Now</button>
                       }
                    }
                     <button (click)="viewDetails.emit(request)" class="px-3 py-1 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600">Details</button>
                     <button (click)="openChat.emit(request)" class="px-3 py-1 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800">Chat</button>
                  </div>
                </div>
              </div>
            </li>
          }
        }
      </ul>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceListComponent {
  serviceRequests = input.required<ServiceRequest[]>();
  currentUser = input.required<User>();
  
  viewDetails = output<ServiceRequest>();
  openChat = output<ServiceRequest>();
  approveQuote = output<ServiceRequest>();
  rejectQuote = output<ServiceRequest>();
  payNow = output<ServiceRequest>();

  private dataService = inject(DataService);

  formatAddress(address: Address): string {
    return address.street + ', ' + address.city;
  }

  statusClass(status: string): string {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const colorClasses: { [key: string]: string } = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Quoted': 'bg-cyan-100 text-cyan-800',
      'Approved': 'bg-indigo-100 text-indigo-800',
      'Assigned': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-purple-100 text-purple-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
    };
    return baseClass + ' ' + (colorClasses[status] || 'bg-gray-100 text-gray-800');
  }

}