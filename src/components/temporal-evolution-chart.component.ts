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
import { I18nService } from "../i18n.service";

@Component({
  selector: "app-temporal-evolution-chart",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="w-full max-w-xs md:max-w-md bg-white dark:bg-gray-800 rounded-lg shadow p-4 mobile-safe flex flex-col items-center"
    >
      <div class="w-full flex justify-center items-center">
        <canvas
          id="temporalCanvas"
          #temporalCanvas
          class="w-full h-auto max-h-64 aspect-square"
          width="220"
          height="220"
        ></canvas>
      </div>
      <div class="flex flex-wrap gap-2 justify-center mt-4 w-full">
        <div class="text-center">
          <div class="text-sm font-medium text-gray-600">Total</div>
          <div class="text-lg font-bold text-blue-600">
            {{ totalRequests() }}
          </div>
        </div>
        <div class="text-center">
          <div class="text-sm font-medium text-gray-600">Média/Dia</div>
          <div class="text-lg font-bold text-green-600">
            {{ averagePerDay() }}
          </div>
        </div>
        <div class="text-center">
          <div class="text-sm font-medium text-gray-600">Tendência</div>
          <div class="text-lg font-bold" [class]="trendColor()">
            {{ trend() }}
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemporalEvolutionChartComponent implements AfterViewInit {
  private readonly i18n = inject(I18nService);

  constructor() {
    effect(() => {
      console.log("[TemporalChart] Título recebido:", this.title());
      this.renderTemporalChart();
    });
  }

  title = input.required<string>();
  data = input<Record<string, number>>();

  totalRequests = computed(() => {
    const d = this.data();
    return Object.values(d).reduce((sum, value) => sum + value, 0);
  });

  averagePerDay = computed(() => {
    const total = this.totalRequests();
    return Math.round(total / 30);
  });

  trend = computed(() => {
    const d = this.data();
    const days = Object.keys(d).length;
    if (days < 2) return "0%";

    const values = Object.values(d);
    const firstHalf = values.slice(0, Math.floor(days / 2));
    const secondHalf = values.slice(Math.floor(days / 2));

    const firstAvg =
      firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    if (firstAvg === 0) return "0%";

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    return `${change > 0 ? "+" : ""}${Math.round(change)}%`;
  });

  trendColor = computed(() => {
    const trend = this.trend();
    return trend.includes("+") ? "text-green-600" : "text-red-600";
  });

  ngAfterViewInit() {
    this.renderTemporalChart();
  }

  renderTemporalChart() {
    const canvas = document.querySelector(
      "canvas#temporalCanvas"
    ) as HTMLCanvasElement;
    if (!canvas) {
      console.warn("[TemporalChart] Canvas não encontrado");
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("[TemporalChart] Contexto 2D não encontrado");
      return;
    }

    const data = this.data();
    const total = this.totalRequests();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (total === 0) {
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#6b7280";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const noDataText = this.i18n.translate("noDataAvailable") || "Sem dados";
      ctx.fillText(noDataText, 110, 110);
      return;
    }

    const entries = Object.entries(data).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    const maxValue = Math.max(...entries.map(([, value]) => value));

    // Configurações do gráfico
    const margin = 20;
    const chartWidth = canvas.width - 2 * margin;
    const chartHeight = canvas.height - 2 * margin;
    const pointRadius = 3;
    const lineWidth = 2;

    // Desenhar eixos
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.moveTo(margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.stroke();

    // Desenhar linha de evolução
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    entries.forEach(([date, value], index) => {
      const x = margin + (index / (entries.length - 1)) * chartWidth;
      const y = canvas.height - margin - (value / maxValue) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Desenhar pontos
    ctx.fillStyle = "#3b82f6";
    entries.forEach(([date, value], index) => {
      const x = margin + (index / (entries.length - 1)) * chartWidth;
      const y = canvas.height - margin - (value / maxValue) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Desenhar área sob a linha
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    ctx.beginPath();
    ctx.moveTo(margin, canvas.height - margin);

    entries.forEach(([date, value], index) => {
      const x = margin + (index / (entries.length - 1)) * chartWidth;
      const y = canvas.height - margin - (value / maxValue) * chartHeight;
      ctx.lineTo(x, y);
    });

    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.closePath();
    ctx.fill();
  }
}
