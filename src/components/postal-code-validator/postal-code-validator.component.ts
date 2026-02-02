import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil,
} from "rxjs/operators";
import { Subject, of } from "rxjs";
import { ValidationResult } from "../../interfaces/postal-code.interface";
import { PortugalAddressValidationService } from "../../services/portugal-address-validation.service";

@Component({
  selector: "app-postal-code-validator",
  imports: [ReactiveFormsModule],
  template: `
    <div class="postal-code-validator">
      <!-- Input do código postal -->
      <div class="input-group">
        <label
          for="postal-code"
          class="block text-sm font-medium text-gray-700"
          >
          {{ label }}
          @if (required) {
            <span class="text-red-500">*</span>
          }
        </label>
        <input
          id="postal-code"
          type="text"
          [formControl]="postalCodeControl"
          [placeholder]="placeholder"
          maxlength="8"
          class="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          [class.border-red-500]="validationResult && !validationResult.isValid"
          [class.border-green-500]="
            validationResult && validationResult.isValid
          "
          [class.border-yellow-500]="isValidating"
          />
    
          <!-- Loading indicator -->
          @if (isValidating) {
            <div
              class="mt-1 flex items-center text-yellow-600"
              >
              <svg
                class="animate-spin -ml-1 mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                >
                <circle
                  class="opacity-25"
                  cx="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span class="text-sm">Validando código postal...</span>
            </div>
          }
    
          <!-- Validation messages -->
          @if (validationResult && !isValidating) {
            <div class="mt-1">
              <!-- Success message -->
              @if (validationResult.isValid) {
                <div
                  class="flex items-center text-green-600"
                  >
                  <svg class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                      />
                    </svg>
                    <span class="text-sm">Código postal válido</span>
                  </div>
                }
                <!-- Error message -->
                @if (!validationResult.isValid) {
                  <div
                    class="flex items-center text-red-600"
                    >
                    <svg class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                        />
                      </svg>
                      <span class="text-sm">{{
                        validationResult.error || "Código postal inválido"
                      }}</span>
                    </div>
                  }
                </div>
              }
    
              <!-- Address info display -->
              @if (
                validationResult && validationResult.isValid && showAddressInfo
                ) {
                <div
                  class="mt-2 p-2 bg-green-50 border border-green-200 rounded-md"
                  >
                  <div class="text-sm text-green-800">
                    <strong>{{ validationResult.locality }}</strong>
                    <div class="text-green-600">
                      {{ validationResult.municipality }},
                      {{ validationResult.district }}
                    </div>
                    @if (validationResult.street) {
                      <div
                        class="text-green-600 text-xs mt-1"
                        >
                        {{ validationResult.street }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
    `,
  styles: [
    `
      .postal-code-validator {
        width: 100%;
      }

      .input-group {
        position: relative;
      }

      .animate-spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class PostalCodeValidatorComponent implements OnInit, OnDestroy {
  @Input() label: string = "Código Postal";
  @Input() placeholder: string = "0000-000";
  @Input() required: boolean = false;
  @Input() showAddressInfo: boolean = true;
  @Input() value: string = "";

  @Output() valueChange = new EventEmitter<string>();
  @Output() validationChange = new EventEmitter<ValidationResult | null>();
  @Output() addressInfoChange = new EventEmitter<{
    locality?: string;
    district?: string;
    municipality?: string;
  }>();

  postalCodeControl = new FormControl("");
  validationResult: ValidationResult | null = null;
  isValidating = false;

  private destroy$ = new Subject<void>();

  constructor(private postalCodeApi: PortugalAddressValidationService) {}

  ngOnInit() {
    // Set initial value
    if (this.value) {
      this.postalCodeControl.setValue(this.value);
    }

    // Setup validation on input changes
    this.postalCodeControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500), // Wait 500ms after user stops typing
        distinctUntilChanged(),
        switchMap((value: string | null) => {
          const postalCode = value?.trim() || "";

          // Emit value change
          this.valueChange.emit(postalCode);

          // Reset validation state
          this.validationResult = null;
          this.validationChange.emit(null);

          // Don't validate empty values
          if (!postalCode) {
            this.isValidating = false;
            return of(null);
          }

          // Validate with API
          this.isValidating = true;
          return this.postalCodeApi.validatePostalCodeWithApi(postalCode);
        })
      )
      .subscribe((result) => {
        this.isValidating = false;
        this.validationResult = result;
        this.validationChange.emit(result);

        // Emit address info if validation successful
        if (result?.isValid) {
          this.addressInfoChange.emit({
            locality: result.locality,
            district: result.district,
            municipality: result.municipality,
          });
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Method to programmatically set value
  setValue(value: string) {
    this.postalCodeControl.setValue(value);
  }

  // Method to get current value
  getValue(): string {
    return this.postalCodeControl.value || "";
  }

  // Method to check if validation is successful
  isValid(): boolean {
    return this.validationResult?.isValid || false;
  }
}
