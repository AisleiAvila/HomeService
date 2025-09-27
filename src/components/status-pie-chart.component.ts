import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-status-pie-chart",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full p-4">
      <h3 class="text-lg font-semibold mb-2">{{ title }}</h3>
      <div class="flex justify-center items-center">
        <canvas id="pieCanvas" #pieCanvas width="220" height="220"></canvas>
      </div>
      <div class="flex flex-wrap gap-2 justify-center mt-4">
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
export class StatusPieChartComponent {
  title = input<string>("Distribuição de Serviços por Status");
  data = input<Record<string, number>>();
  labels = input<Record<string, string>>();

  chartData = computed(() => {
    const d = this.data();
    const l = this.labels();
    const colors = [
      "#2563eb",
      "#059669",
      "#eab308",
      "#ef4444",
      "#6366f1",
      "#f59e42",
      "#10b981",
      "#f43f5e",
      "#a3e635",
      "#f472b6",
    ];
    let i = 0;
    return Object.entries(d).map(([status, value]) => ({
      label: l[status] || status,
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
    const data = this.chartData();
    const total = data.reduce((sum, item) => sum + item.value, 0);
    console.log("[PieChart] Dados recebidos:", data);
    console.log("[PieChart] Total:", total);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (total === 0) {
      // Desenha círculo cinza indicando ausência de dados
      ctx.beginPath();
      ctx.arc(110, 110, 100, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fillStyle = "#d1d5db"; // gray-300
      ctx.fill();
      // Mensagem central
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#6b7280"; // gray-500
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Sem dados", 110, 110);
      return;
    }
    let startAngle = 0;
    data.forEach((item) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(110, 110);
      ctx.arc(110, 110, 100, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      startAngle += sliceAngle;
    });
  }
}
