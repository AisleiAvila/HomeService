import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";
import { PostalCodeApiService } from "../../services/postal-code-api.service";
import { PortugalAddressValidationService } from "../../services/portugal-address-validation.service";
import {
  ValidationResult,
  PostalCodeResult,
  BatchTestResult,
} from "../../interfaces/postal-code.interface";

@Component({
  selector: "app-postal-code-demo",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="max-w-4xl mx-auto p-6 bg-white">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">
        🇵🇹 Demonstração da Validação de Códigos Postais Portugueses
      </h1>

      <!-- API Status -->
      <div class="mb-6 p-4 rounded-lg" [class]="getApiStatusClass()">
        <div class="flex items-center">
          <div class="mr-3">
            <span *ngIf="apiStatus === 'checking'" class="text-2xl">⏳</span>
            <span *ngIf="apiStatus === 'online'" class="text-2xl">✅</span>
            <span *ngIf="apiStatus === 'offline'" class="text-2xl">❌</span>
          </div>
          <div>
            <p class="font-semibold">{{ getApiStatusText() }}</p>
            <p class="text-sm opacity-80">{{ getApiStatusDescription() }}</p>
          </div>
        </div>
      </div>

      <!-- Quick Test Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- Quick Validation -->
        <div class="bg-gray-50 p-6 rounded-lg">
          <h2 class="text-xl font-semibold mb-4">🚀 Teste Rápido</h2>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Código Postal
              </label>
              <input
                type="text"
                [(ngModel)]="quickTestCode"
                (input)="onQuickTestInput()"
                placeholder="1000-001"
                maxlength="8"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                [class.border-red-500]="
                  quickTestResult && !quickTestResult.isValid
                "
                [class.border-green-500]="
                  quickTestResult && quickTestResult.isValid
                "
              />
            </div>

            <!-- Loading -->
            <div *ngIf="isQuickTesting" class="flex items-center text-blue-600">
              <svg
                class="animate-spin h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
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
              Validando...
            </div>

            <!-- Result -->
            <div
              *ngIf="quickTestResult && !isQuickTesting"
              class="p-3 rounded-lg"
              [class]="
                quickTestResult.isValid
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              "
            >
              <div class="flex items-center">
                <span class="mr-2">{{
                  quickTestResult.isValid ? "✅" : "❌"
                }}</span>
                <span class="font-medium">
                  {{
                    quickTestResult.isValid
                      ? "Código Postal Válido"
                      : "Código Postal Inválido"
                  }}
                </span>
              </div>

              <div *ngIf="quickTestResult.isValid" class="mt-2 text-sm">
                <p>
                  <strong>Localidade:</strong> {{ quickTestResult.locality }}
                </p>
                <p><strong>Distrito:</strong> {{ quickTestResult.district }}</p>
                <p>
                  <strong>Concelho:</strong> {{ quickTestResult.municipality }}
                </p>
                <p *ngIf="quickTestResult.street">
                  <strong>Rua:</strong> {{ quickTestResult.street }}
                </p>
              </div>

              <div
                *ngIf="!quickTestResult.isValid && quickTestResult.error"
                class="mt-2 text-sm"
              >
                <p>{{ quickTestResult.error }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Predefined Tests -->
        <div class="bg-gray-50 p-6 rounded-lg">
          <h2 class="text-xl font-semibold mb-4">🧪 Códigos de Teste</h2>

          <div class="space-y-2">
            <button
              *ngFor="let testCase of predefinedTests"
              (click)="testPredefinedCode(testCase.code)"
              class="w-full text-left p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div class="flex justify-between items-center">
                <div>
                  <span class="font-mono text-sm">{{ testCase.code }}</span>
                  <span class="text-gray-600 ml-2">{{
                    testCase.description
                  }}</span>
                </div>
                <span class="text-xs text-gray-400">{{
                  testCase.expected
                }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Batch Testing -->
      <div class="bg-gray-50 p-6 rounded-lg mb-8">
        <h2 class="text-xl font-semibold mb-4">📊 Teste em Lote</h2>

        <div class="flex gap-4 mb-4">
          <button
            (click)="runBatchTest()"
            [disabled]="isBatchTesting"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isBatchTesting ? "Testando..." : "Executar Teste em Lote" }}
          </button>

          <button
            (click)="clearBatchResults()"
            [disabled]="batchResults.length === 0"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limpar Resultados
          </button>
        </div>

        <!-- Batch Progress -->
        <div *ngIf="isBatchTesting" class="mb-4">
          <div class="bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              [style.width.%]="batchProgress"
            ></div>
          </div>
          <p class="text-sm text-gray-600 mt-1">
            Progresso: {{ batchCurrentIndex }} de {{ batchTotalTests }}
          </p>
        </div>

        <!-- Batch Results -->
        <div
          *ngIf="batchResults.length > 0"
          class="space-y-2 max-h-64 overflow-y-auto"
        >
          <div
            *ngFor="let result of batchResults"
            class="p-3 rounded-md border"
            [class]="
              result.isValid
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            "
          >
            <div class="flex justify-between items-start">
              <div>
                <span class="font-mono text-sm">{{ result.postalCode }}</span>
                <span class="ml-2">{{ result.isValid ? "✅" : "❌" }}</span>
                <div *ngIf="result.isValid" class="text-xs text-gray-600 mt-1">
                  {{ result.locality }}, {{ result.district }}
                </div>
                <div
                  *ngIf="!result.isValid && result.error"
                  class="text-xs text-red-600 mt-1"
                >
                  {{ result.error }}
                </div>
              </div>
              <span class="text-xs text-gray-400"
                >{{ result.responseTime }}ms</span
              >
            </div>
          </div>
        </div>

        <!-- Batch Statistics -->
        <div
          *ngIf="batchResults.length > 0 && !isBatchTesting"
          class="mt-4 p-4 bg-white rounded-lg border"
        >
          <h3 class="font-medium mb-2">📈 Estatísticas</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p class="text-gray-600">Total testado</p>
              <p class="font-semibold">{{ batchResults.length }}</p>
            </div>
            <div>
              <p class="text-gray-600">Válidos</p>
              <p class="font-semibold text-green-600">
                {{ getBatchValidCount() }}
              </p>
            </div>
            <div>
              <p class="text-gray-600">Inválidos</p>
              <p class="font-semibold text-red-600">
                {{ getBatchInvalidCount() }}
              </p>
            </div>
            <div>
              <p class="text-gray-600">Tempo médio</p>
              <p class="font-semibold">{{ getAverageResponseTime() }}ms</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Locality Search -->
      <div class="bg-gray-50 p-6 rounded-lg">
        <h2 class="text-xl font-semibold mb-4">🏙️ Busca por Localidade</h2>

        <div class="mb-4">
          <input
            type="text"
            [(ngModel)]="localityQuery"
            (input)="onLocalitySearch()"
            placeholder="Digite o nome da cidade (ex: Lisboa, Porto, Coimbra)"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div
          *ngIf="isSearchingLocality"
          class="flex items-center text-blue-600 mb-4"
        >
          <svg
            class="animate-spin h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
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
          Buscando códigos postais...
        </div>

        <div
          *ngIf="localityResults.length > 0"
          class="space-y-2 max-h-48 overflow-y-auto"
        >
          <div
            *ngFor="let result of localityResults"
            class="p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
            (click)="useLocalityResult(result)"
          >
            <div class="flex justify-between items-center">
              <div>
                <span class="font-mono text-sm">{{ result.cp }}</span>
                <span class="text-gray-600 ml-2">{{ result.locality }}</span>
                <div class="text-xs text-gray-500">
                  {{ result.municipality }}, {{ result.district }}
                </div>
              </div>
              <span class="text-xs text-blue-600">Usar</span>
            </div>
          </div>
        </div>

        <div
          *ngIf="
            localityQuery.length > 2 &&
            localityResults.length === 0 &&
            !isSearchingLocality
          "
          class="text-gray-500 text-center py-4"
        >
          Nenhum resultado encontrado para "{{ localityQuery }}"
        </div>
      </div>
    </div>
  `,
  styles: [
    `
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
export class PostalCodeDemoComponent implements OnInit {
  // API Status
  apiStatus: "checking" | "online" | "offline" = "checking";

  // Quick Test
  quickTestCode = "";
  quickTestResult: ValidationResult | null = null;
  isQuickTesting = false;
  private quickTestTimeout: any;

  // Predefined Tests
  predefinedTests = [
    { code: "1000-001", description: "Lisboa Centro", expected: "Válido" },
    { code: "4000-001", description: "Porto Centro", expected: "Válido" },
    {
      code: "1100-048",
      description: "Rua Augusta, Lisboa",
      expected: "Válido",
    },
    {
      code: "9999-999",
      description: "Código inexistente",
      expected: "Inválido",
    },
    { code: "1234", description: "Formato incompleto", expected: "Inválido" },
  ];

  // Batch Testing
  isBatchTesting = false;
  batchResults: BatchTestResult[] = [];
  batchProgress = 0;
  batchCurrentIndex = 0;
  batchTotalTests = 0;

  // Locality Search
  localityQuery = "";
  localityResults: PostalCodeResult[] = [];
  isSearchingLocality = false;
  private localitySearchTimeout: any;

  constructor(
    private postalCodeApi: PostalCodeApiService,
    private portugalValidation: PortugalAddressValidationService
  ) {}

  ngOnInit() {
    this.checkApiStatus();
  }

  async checkApiStatus() {
    this.apiStatus = "checking";

    try {
      const isOnline = await this.postalCodeApi
        .testApiConnectivity()
        .toPromise();
      this.apiStatus = isOnline ? "online" : "offline";
    } catch {
      this.apiStatus = "offline";
    }
  }

  getApiStatusClass(): string {
    switch (this.apiStatus) {
      case "checking":
        return "bg-yellow-100 text-yellow-800";
      case "online":
        return "bg-green-100 text-green-800";
      case "offline":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  getApiStatusText(): string {
    switch (this.apiStatus) {
      case "checking":
        return "Verificando API...";
      case "online":
        return "API Online";
      case "offline":
        return "API Offline";
      default:
        return "Status desconhecido";
    }
  }

  getApiStatusDescription(): string {
    switch (this.apiStatus) {
      case "checking":
        return "Testando conectividade com https://www.codigo-postal.pt/";
      case "online":
        return "Conectado à API oficial de códigos postais portugueses";
      case "offline":
        return "Usando validação offline. Funcionalidade limitada.";
      default:
        return "";
    }
  }

  onQuickTestInput() {
    clearTimeout(this.quickTestTimeout);
    this.quickTestResult = null;

    if (!this.quickTestCode.trim()) {
      return;
    }

    this.quickTestTimeout = setTimeout(() => {
      this.validateQuickTest();
    }, 500);
  }

  async validateQuickTest() {
    if (!this.quickTestCode.trim()) return;

    this.isQuickTesting = true;
    const result = await this.performValidation(this.quickTestCode);
    this.quickTestResult = result;
    this.isQuickTesting = false;
  }

  /**
   * Método auxiliar para realizar validação com medição de tempo
   */
  private async performValidation(
    postalCode: string
  ): Promise<BatchTestResult> {
    const startTime = Date.now();

    try {
      const result = await this.postalCodeApi
        .validatePostalCode(postalCode)
        .toPromise();
      const responseTime = Date.now() - startTime;

      return {
        ...result,
        isValid: result?.isValid ?? false,
        postalCode,
        responseTime,
      };
    } catch (error) {
      return {
        isValid: false,
        postalCode,
        error: "Erro na validação: " + (error as Error).message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  testPredefinedCode(code: string) {
    this.quickTestCode = code;
    this.validateQuickTest();
  }

  async runBatchTest() {
    const testCodes = [
      "1000-001",
      "1100-048",
      "1200-001",
      "1300-001",
      "4000-001",
      "4100-001",
      "4200-001",
      "3000-001",
      "3100-001",
      "2000-001",
      "8000-001",
      "2870-005", // Montijo - código adicionado para teste
      "9999-999",
      "0000-000",
      "1234",
      "invalid",
    ];

    this.initializeBatchTest(testCodes.length);

    for (let i = 0; i < testCodes.length; i++) {
      const code = testCodes[i];
      this.updateBatchProgress(i + 1, testCodes.length);

      const result = await this.performValidation(code);
      this.batchResults.push(result);

      // Small delay to prevent overwhelming the API
      await this.delay(100);
    }

    this.isBatchTesting = false;
  }

  /**
   * Inicializa o teste em lote
   */
  private initializeBatchTest(totalTests: number) {
    this.isBatchTesting = true;
    this.batchResults = [];
    this.batchProgress = 0;
    this.batchCurrentIndex = 0;
    this.batchTotalTests = totalTests;
  }

  /**
   * Atualiza o progresso do teste em lote
   */
  private updateBatchProgress(currentIndex: number, totalTests: number) {
    this.batchCurrentIndex = currentIndex;
    this.batchProgress = (currentIndex / totalTests) * 100;
  }

  /**
   * Utilitário para delay assíncrono
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  clearBatchResults() {
    this.batchResults = [];
    this.batchProgress = 0;
    this.batchCurrentIndex = 0;
    this.batchTotalTests = 0;
  }

  getBatchValidCount(): number {
    return this.batchResults.filter((r) => r.isValid).length;
  }

  getBatchInvalidCount(): number {
    return this.batchResults.filter((r) => !r.isValid).length;
  }

  getAverageResponseTime(): number {
    if (this.batchResults.length === 0) return 0;
    const total = this.batchResults.reduce((sum, r) => sum + r.responseTime, 0);
    return Math.round(total / this.batchResults.length);
  }

  onLocalitySearch() {
    clearTimeout(this.localitySearchTimeout);
    this.localityResults = [];

    if (this.localityQuery.length < 2) {
      return;
    }

    this.localitySearchTimeout = setTimeout(() => {
      this.searchLocality();
    }, 500);
  }

  async searchLocality() {
    if (this.localityQuery.length < 2) return;

    this.isSearchingLocality = true;

    try {
      const results = await this.postalCodeApi
        .searchByLocality(this.localityQuery)
        .toPromise();
      this.localityResults = results || [];
    } catch (error) {
      console.error("Erro na busca por localidade:", error);
      this.localityResults = [];
    } finally {
      this.isSearchingLocality = false;
    }
  }

  useLocalityResult(result: PostalCodeResult) {
    this.quickTestCode = result.cp;
    this.validateQuickTest();

    // Scroll to quick test section
    const quickTestElement = document.querySelector(".bg-gray-50");
    if (quickTestElement) {
      quickTestElement.scrollIntoView({ behavior: "smooth" });
    }
  }
}
