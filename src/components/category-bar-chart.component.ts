import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  effect,
  AfterViewInit,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { I18nService } from "@/src/i18n.service";

@Component({
  selector: "app-category-bar-chart",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="w-full max-w-xs md:max-w-md bg-white dark:bg-gray-800 rounded-lg shadow p-4 mobile-safe flex flex-col items-center"
    >
      <div class="w-full flex justify-center items-center">
        <canvas
          id="barCanvas"
          #barCanvas
          class="w-full h-auto max-h-64 aspect-square"
          width="220"
          height="220"
        ></canvas>
      </div>
      <div class="flex flex-wrap gap-2 justify-center mt-4 w-full">
        <ng-container *ngFor="let item of chartData()">
          <span
            class="px-2 py-1 rounded text-xs font-medium"
            [style.background]="item.color"
            [style.color]="'white'"
          >
            {{ item.label }}: {{ item.value }}
          </span>
        </ng-container>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBarChartComponent implements AfterViewInit {
  // Injeção do serviço de i18n
  readonly i18n = inject(I18nService);
  constructor() {
    // Log para depuração do valor do título
    effect(() => {
      console.log("[BarChart] Título recebido:", this.title());
      this.renderBarChart();
    });
  }

  title = input.required<string>();
  data = input<Record<string, number>>();
  labels = input<Record<string, string>>();

  chartData = computed(() => {
    const d = this.data();
    const providedLabels = this.labels();
    
    // Verificação de segurança: retornar array vazio se data não existir
    if (!d) {
      console.warn('[BarChart] Data undefined:', { data: d });
      return [];
    }
    
    const colors = [
      "#2563eb", // blue-600
      "#059669", // emerald-600
      "#eab308", // yellow-500
      "#ef4444", // red-500
      "#6366f1", // indigo-500
      "#f59e42", // amber-500
      "#10b981", // emerald-500
      "#f43f5e", // rose-500
      "#a3e635", // lime-500
      "#f472b6", // pink-400
    ];
    let i = 0;
    return Object.entries(d).map(([category, value]) => ({
      label: providedLabels?.[category] || this.i18n.translate(category) || category,
      value,
      color: colors[i++ % colors.length],
    }));
  });

  ngAfterViewInit() {
    this.renderBarChart();
  }

  renderBarChart() {
    const canvas = document.querySelector("canvas#barCanvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      console.warn("[BarChart] Canvas não encontrado ou tipo inválido");
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("[BarChart] Contexto 2D não encontrado");
      return;
    }

    const data = this.chartData();
    const total = data.reduce((sum, item) => sum + item.value, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (total === 0) {
      // Desenha mensagem de ausência de dados
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#6b7280"; // gray-500
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const i18nText = this.i18n.translate("noDataAvailable") || "Sem dados";
      ctx.fillText(i18nText, canvas.width / 2, canvas.height / 2);
      return;
    }

    const maxValue = Math.max(...data.map((item) => item.value));
    const barWidth = (canvas.width - 60) / data.length; // 30px margin on each side
    const barSpacing = 4;
    const actualBarWidth = Math.max(barWidth - barSpacing, 12); // Minimum bar width of 12px
    const chartHeight = canvas.height - 60; // 30px margin top and bottom
    const xStart = 30;

    // Draw bars
    let index = 0;
    for (const item of data) {
      const barHeight = (item.value / maxValue) * chartHeight;
      const x = xStart + index * barWidth;
      const y = canvas.height - 30 - barHeight;

      // Draw bar
      ctx.fillStyle = item.color;
      ctx.fillRect(x, y, actualBarWidth, barHeight);

      // Draw value on top of bar (only if there's space)
      if (barHeight > 20) {
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "#374151"; // gray-700
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(item.value.toString(), x + actualBarWidth / 2, y - 2);
      }

      // Draw category label below the bar
      ctx.font = "8px sans-serif";
      ctx.fillStyle = "#6b7280"; // gray-500
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(item.label, x + actualBarWidth / 2, canvas.height - 25);
      index++;
    }

    // Draw Y-axis
    ctx.strokeStyle = "#d1d5db"; // gray-300
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(25, 30);
    ctx.lineTo(25, canvas.height - 30);
    ctx.stroke();

    // Draw X-axis
    ctx.beginPath();
    ctx.moveTo(25, canvas.height - 30);
    ctx.lineTo(canvas.width - 30, canvas.height - 30);
    ctx.stroke();
  }
}
