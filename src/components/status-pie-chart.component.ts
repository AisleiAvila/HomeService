import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  effect,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { I18nService } from "../i18n.service";

@Component({
  selector: "app-status-pie-chart",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="w-full max-w-xs md:max-w-md bg-gradient-to-br from-white to-gray-50 dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mobile-safe flex flex-col items-center"
    >
      <div class="w-full flex justify-center items-center">
        <canvas
          id="pieCanvas"
          #pieCanvas
          class="w-full h-auto max-h-64 aspect-square"
          width="220"
          height="220"
        ></canvas>
      </div>
      <div class="flex flex-wrap gap-2 justify-center mt-6 w-full">
        <ng-container *ngFor="let item of chartData()">
          <span
            class="px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm border border-opacity-20 border-gray-700"
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
export class StatusPieChartComponent {
  private readonly i18n = inject(I18nService);

  constructor() {
    // Log para depuração do valor do título
    effect(() => {
      console.log("[PieChart] Título recebido:", this.title());
      this.renderPieChart();
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
      console.warn('[PieChart] Data undefined:', { data: d });
      return [];
    }
    
    const colors = [
      "#ea5455", // brand-primary - Vermelho Natan
      "#475569", // slate-600 - Cinza ardósia
      "#0f766e", // teal-700 - Verde-azulado
      "#7c3aed", // violet-600 - Violeta elegante
      "#0891b2", // cyan-600 - Ciano corporativo
      "#059669", // emerald-600 - Verde esmeralda
      "#6b7280", // gray-500 - Cinza neutro
      "#f59e0b", // amber-500 - Âmbar
      "#0369a1", // sky-700 - Azul céu escuro
      "#9e9e9e", // brand-accent - Cinza secundária
    ];
    let i = 0;
    return Object.entries(d).map(([status, value]) => ({
      label: providedLabels?.[status] || this.i18n.translate(status) || status,
      value,
      color: colors[i++ % colors.length],
    }));
  });

  ngAfterViewInit() {
    this.renderPieChart();
  }

  renderPieChart() {
    const canvas = document.querySelector(
      "canvas#pieCanvas"
    ) as HTMLCanvasElement;
    if (!canvas) {
      console.warn("[PieChart] Canvas não encontrado");
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("[PieChart] Contexto 2D não encontrado");
      return;
    }
    // Usa todos os itens da legenda, mesmo com valor zero
    const data = this.chartData();
    const total = data.reduce((sum, item) => sum + item.value, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (total === 0) {
      // Desenha círculo cinza indicando ausência de dados
      ctx.beginPath();
      ctx.arc(110, 110, 100, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#6b7280"; // gray-500
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const noDataText = this.i18n.translate("noDataAvailable") || "Sem dados";
      ctx.fillText(noDataText, 110, 110);
      return;
    }
    let startAngle = 0;
    data.forEach((item) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      
      // Desenhar fatia com sombra sutil
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.beginPath();
      ctx.moveTo(110, 110);
      ctx.arc(110, 110, 100, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      
      ctx.restore();
      
      // Adicionar borda branca fina entre fatias para separação visual
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      startAngle += sliceAngle;
    });
  }
}

