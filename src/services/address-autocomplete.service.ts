import { Injectable } from "@angular/core";
import { Address } from "../models/maintenance.models";

@Injectable({
  providedIn: "root",
})
export class AddressAutocompleteService {
  constructor() {}

  getSuggestions(query: string): Promise<Address[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!query) {
          resolve([]);
          return;
        }

        // In a real application, this would call a geocoding API
        // For now, return empty array since we removed mock data
        // TODO: Integrate with Google Places API, Mapbox, or similar service
        resolve([]);
      }, 300); // Simulate network latency
    });
  }
}
