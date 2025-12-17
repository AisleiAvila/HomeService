import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  effect,
  inject,
  signal,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { I18nService } from "../i18n.service";

@Component({
  selector: "app-status-pie-chart",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="w-full max-w-xs md:max-w-md bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mobile-safe flex flex-col items-center"
    >
      <div class="w-full flex justify-center items-center relative">
        <canvas
          #pieCanvas
          class="w-full h-auto max-h-64 aspect-square cursor-pointer"
          width="240"
          height="240"
          (mousemove)="onMouseMove($event)"
          (mouseleave)="onMouseLeave()"
        ></canvas>
        
        <!-- Tooltip -->
        @if(hoveredSegment()) {
          <div 
            class="absolute bg-gray-900 dark:bg-gray-700 text-white px-3 py-2 rounded-lg shadow-xl text-sm font-medium pointer-events-none z-10 transition-all duration-200"
            [style.left.px]="tooltipPosition().x"
            [style.top.px]="tooltipPosition().y"
          >
            <div class="font-bold">{{ hoveredSegment()!.label }}</div>
            <div class="text-xs mt-1">
              {{ hoveredSegment()!.value }} ({{ hoveredSegment()!.percentage }}%)
            </div>
          </div>
        }
      </div>
      
      <!-- Legendas com percentuais -->
      <div class="flex flex-wrap gap-2 justify-center mt-6 w-full">
        <ng-container *ngFor="let item of chartData()">
          <span
            class="px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm border border-opacity-20 border-gray-700 transition-transform hover:scale-105 cursor-default"
            [style.background]="item.color"
            [style.color]="'white'"
          >
            {{ item.label }}: {{ item.value }} ({{ item.percentage }}%)
          </span>
        </ng-container>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusPieChartComponent {
  private readonly i18n = inject(I18nService);
  
  @ViewChild('pieCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  // Signals para controle de hover e tooltip
  hoveredSegment = signal<{label: string; value: number; percentage: string; color: string} | null>(null);
  tooltipPosition = signal<{x: number; y: number}>({x: 0, y: 0});
  private animationProgress = signal(0);
  private segments: Array<{startAngle: number; endAngle: number; item: any}> = [];

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
    
    // Cores da identidade visual da marca (baseado no Design System Natan)
    const colors = [
      "#ea5455", // brand-primary - Vermelho Natan (principal)
      "#475569", // slate-600 - Cinza ardósia (neutro)
      "#0f766e", // teal-700 - Verde-azulado (sucesso/completado)
      "#f59e0b", // amber-500 - Âmbar (pendente/atenção)
      "#7c3aed", // violet-600 - Violeta (em progresso)
      "#0891b2", // cyan-600 - Ciano (informação)
      "#059669", // emerald-600 - Verde esmeralda (aprovado)
      "#ef4444", // red-500 - Vermelho (cancelado)
      "#6b7280", // gray-500 - Cinza neutro
      "#9e9e9e", // brand-accent - Cinza secundária
    ];
    
    // Calcular total para percentuais
    const total = Object.values(d).reduce((sum, val) => sum + val, 0);
    
    let i = 0;
    return Object.entries(d).map(([status, value]) => {
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
      return {
        label: providedLabels?.[status] || this.i18n.translate(status) || status,
        value,
        percentage,
        color: colors[i++ % colors.length],
      };
    });
  });

  ngAfterViewInit() {
    // Iniciar animação suave ao carregar
    this.animateChart();
  }
  
  // Animação suave ao carregar o gráfico
  private animateChart() {
    const duration = 800; // ms
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      this.animationProgress.set(1 - Math.pow(1 - progress, 3));
      
      this.renderPieChart();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  // Detectar hover sobre segmentos
  onMouseMove(event: MouseEvent) {
    if (!this.canvasRef) return;
    
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Ajustar para coordenadas do canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    
    // Centro do donut
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Calcular distância e ângulo do centro
    const dx = canvasX - centerX;
    const dy = canvasY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
    
    // Verificar se está dentro do anel do donut
    const outerRadius = 100;
    const innerRadius = 60;
    
    if (distance >= innerRadius && distance <= outerRadius) {
      // Encontrar segmento correspondente
      const segment = this.segments.find(s => 
        normalizedAngle >= s.startAngle && normalizedAngle <= s.endAngle
      );
      
      if (segment) {
        this.hoveredSegment.set({
          label: segment.item.label,
          value: segment.item.value,
          percentage: segment.item.percentage,
          color: segment.item.color
        });
        
        this.tooltipPosition.set({
          x: x - 60, // Offset para centralizar tooltip
          y: y - 50
        });
        return;
      }
    }
    
    this.hoveredSegment.set(null);
  }
  
  onMouseLeave() {
    this.hoveredSegment.set(null);
  }

  renderPieChart() {
    if (!this.canvasRef) {
      console.warn("[PieChart] Canvas ref não encontrado");
      return;
    }
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("[PieChart] Contexto 2D não encontrado");
      return;
    }
    
    // Usa todos os itens da legenda, mesmo com valor zero
    const data = this.chartData();
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const outerRadius = 100;
    const innerRadius = 60; // Criar efeito donut
    
    if (total === 0) {
      // Desenha donut cinza indicando ausência de dados
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
      ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI, true); // Reverso para criar buraco
      ctx.closePath();
      ctx.fillStyle = "#e5e7eb"; // gray-200
      ctx.fill();
      
      // Texto no centro
      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = "#6b7280"; // gray-500
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const noDataText = this.i18n.translate("noDataAvailable") || "Sem dados";
      ctx.fillText(noDataText, centerX, centerY);
      return;
    }
    
    // Aplicar progresso de animação
    const progress = this.animationProgress();
    let startAngle = -Math.PI / 2; // Começar no topo
    this.segments = [];
    
    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI * progress;
      const endAngle = startAngle + sliceAngle;
      
      // Salvar informações do segmento para detecção de hover
      this.segments.push({
        startAngle: startAngle + Math.PI / 2, // Normalizar para detecção
        endAngle: endAngle + Math.PI / 2,
        item
      });
      
      // Efeito de hover: aumentar ligeiramente o raio
      const isHovered = this.hoveredSegment()?.label === item.label;
      const currentOuterRadius = isHovered ? outerRadius + 5 : outerRadius;
      
      // Desenhar segmento do donut com sombra sutil
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentOuterRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      
      // Gradiente sutil para cada segmento
      const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, currentOuterRadius);
      gradient.addColorStop(0, item.color);
      gradient.addColorStop(1, item.color + 'dd'); // Adicionar transparência sutil
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.restore();
      
      // Adicionar borda branca fina entre fatias para separação visual
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      startAngle = endAngle;
    });
    
    // Desenhar total no centro do donut
    if (progress >= 1) {
      ctx.font = "bold 24px sans-serif";
      ctx.fillStyle = "#111827"; // gray-900 para light mode
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(total.toString(), centerX, centerY - 8);
      
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#6b7280"; // gray-500
      ctx.fillText(this.i18n.translate("total") || "Total", centerX, centerY + 12);
    }
  }
}
