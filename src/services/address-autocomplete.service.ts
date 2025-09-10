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
        if (!query || query.length < 3) {
          resolve([]);
          return;
        }

        // Simulação de endereços portugueses
        // Em produção, integraria com API dos CTT, Google Places ou similar
        const mockPortugueseAddresses: Address[] = [
          {
            street: "Rua Augusta, 123",
            city: "Lisboa",
            state: "Lisboa",
            zip_code: "1100-048",
            freguesia: "Santa Maria Maior",
            concelho: "Lisboa",
          },
          {
            street: "Avenida dos Aliados, 456",
            city: "Porto",
            state: "Porto",
            zip_code: "4000-066",
            freguesia:
              "Cedofeita, Santo Ildefonso, Sé, Miragaia, São Nicolau e Vitória",
            concelho: "Porto",
          },
          {
            street: "Rua Ferreira Borges, 789",
            city: "Coimbra",
            state: "Coimbra",
            zip_code: "3000-180",
            freguesia:
              "Coimbra (Sé Nova, Santa Cruz, Almedina e São Bartolomeu)",
            concelho: "Coimbra",
          },
          {
            street: "Praça do Comércio, 1",
            city: "Lisboa",
            state: "Lisboa",
            zip_code: "1100-148",
            freguesia: "Santa Maria Maior",
            concelho: "Lisboa",
          },
          {
            street: "Rua de Santa Catarina, 300",
            city: "Porto",
            state: "Porto",
            zip_code: "4000-447",
            freguesia:
              "Cedofeita, Santo Ildefonso, Sé, Miragaia, São Nicolau e Vitória",
            concelho: "Porto",
          },
        ];

        // Filtrar sugestões baseadas na query
        const filteredSuggestions = mockPortugueseAddresses.filter(
          (address) =>
            address.street.toLowerCase().includes(query.toLowerCase()) ||
            address.city.toLowerCase().includes(query.toLowerCase())
        );

        resolve(filteredSuggestions);
      }, 300); // Simula latência de rede
    });
  }

  /**
   * Busca endereços por código postal
   */
  getAddressByPostalCode(postalCode: string): Promise<Address | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Em produção, integraria com API dos CTT
        const mockData: Record<string, Address> = {
          "1100-048": {
            street: "",
            city: "Lisboa",
            state: "Lisboa",
            zip_code: "1100-048",
            freguesia: "Santa Maria Maior",
            concelho: "Lisboa",
          },
          "4000-066": {
            street: "",
            city: "Porto",
            state: "Porto",
            zip_code: "4000-066",
            freguesia:
              "Cedofeita, Santo Ildefonso, Sé, Miragaia, São Nicolau e Vitória",
            concelho: "Porto",
          },
        };

        resolve(mockData[postalCode] || null);
      }, 300);
    });
  }
}
