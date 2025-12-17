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
      class="w-full max-w-xs md:max-w-md bg-gradient-to-br from-white to-gray-50 dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mobile-safe flex flex-col items-center"
    >
      <div class="w-full flex justify-center items-center">
        <canvas
          id="temporalCanvas"
          #temporalCanvas
          class="w-full h-auto max-h-64 aspect-square"
          width="440"
          height="440"
        ></canvas>
      </div>
      <div class="flex flex-wrap gap-4 justify-center mt-6 w-full">
        <div class="text-center px-4 py-2 bg-brand-primary-50 rounded-lg border border-brand-primary-100">
          <div class="text-xs font-medium text-gray-600 uppercase tracking-wide">Total</div>
          <div class="text-xl font-bold text-brand-primary-800">
            {{ totalRequests() }}
          </div>
        </div>
        <div class="text-center px-4 py-2 bg-teal-50 rounded-lg border border-teal-100">
          <div class="text-xs font-medium text-gray-600 uppercase tracking-wide">Média/Dia</div>
          <div class="text-xl font-bold text-teal-700">
            {{ averagePerDay() }}
          </div>
        </div>
        <div class="text-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
          <div class="text-xs font-medium text-gray-600 uppercase tracking-wide">Tendência</div>
          <div class="text-xl font-bold" [class]="trendColor()">
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
    return trend.includes("+") ? "text-teal-700" : "text-slate-600";
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

    // Aplicar devicePixelRatio para melhorar nitidez em displays de alta densidade
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const data = this.data();
    const total = this.totalRequests();

    ctx.clearRect(0, 0, rect.width, rect.height);

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

    // Configurações do gráfico (usar dimensões CSS, não canvas.width)
    const margin = 20;
    const chartWidth = rect.width - 2 * margin;
    const chartHeight = rect.height - 2 * margin;
    const pointRadius = 4;
    const lineWidth = 2.5;

    // Desenhar eixos com estilo sutil
    ctx.strokeStyle = "#e5e7eb"; // gray-200
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, rect.height - margin);
    ctx.moveTo(margin, rect.height - margin);
    ctx.lineTo(rect.width - margin, rect.height - margin);
    ctx.stroke();

    // Desenhar área sob a linha primeiro (fundo)
    const gradient = ctx.createLinearGradient(0, margin, 0, rect.height - margin);
    gradient.addColorStop(0, "rgba(255, 56, 56, 0.2)"); // Vermelho vibrante com transparência
    gradient.addColorStop(1, "rgba(255, 56, 56, 0.05)");
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(margin, rect.height - margin);

    entries.forEach(([date, value], index) => {
      const x = margin + (index / (entries.length - 1)) * chartWidth;
      const y = rect.height - margin - (value / maxValue) * chartHeight;
      ctx.lineTo(x, y);
    });

    ctx.lineTo(rect.width - margin, rect.height - margin);
    ctx.closePath();
    ctx.fill();

    // Desenhar linha de evolução com sombra
    ctx.save();
    ctx.shadowColor = 'rgba(255, 56, 56, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    
    ctx.strokeStyle = "#FF3838"; // Vermelho vibrante
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    entries.forEach(([date, value], index) => {
      const x = margin + (index / (entries.length - 1)) * chartWidth;
      const y = rect.height - margin - (value / maxValue) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
    ctx.restore();

    // Desenhar pontos com borda branca
    entries.forEach(([date, value], index) => {
      const x = margin + (index / (entries.length - 1)) * chartWidth;
      const y = rect.height - margin - (value / maxValue) * chartHeight;

      // Borda branca
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, pointRadius + 1.5, 0, 2 * Math.PI);
      ctx.fill();
      
      // Ponto interno
      ctx.fillStyle = "#FF3838"; // Vermelho vibrante
      ctx.beginPath();
      ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
}

