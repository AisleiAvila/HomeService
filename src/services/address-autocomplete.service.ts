import { Injectable } from '@angular/core';
import { Address } from '../models/maintenance.models';

@Injectable({
  providedIn: 'root'
})
export class AddressAutocompleteService {

  private mockAddresses: Address[] = [
    { street: '123 Main St', city: 'Anytown', state: 'CA', zip_code: '12345' },
    { street: '456 Oak Ave', city: 'Someplace', state: 'NY', zip_code: '54321' },
    { street: '789 Pine Ln', city: 'Elsewhere', state: 'TX', zip_code: '67890' },
    { street: '101 Maple Dr', city: 'Anytown', state: 'CA', zip_code: '12346' },
  ];

  constructor() { }

  getSuggestions(query: string): Promise<Address[]> {
    return new Promise(resolve => {
        setTimeout(() => {
            if (!query) {
                resolve([]);
                return;
            }
            const lowerQuery = query.toLowerCase();
            const filtered = this.mockAddresses.filter(addr => 
              addr.street.toLowerCase().includes(lowerQuery) ||
              addr.city.toLowerCase().includes(lowerQuery)
            );
            resolve(filtered);
        }, 300); // Simulate network latency
    });
  }
}