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

import { I18nService } from "../i18n.service";

  @Component({
  selector: "app-status-pie-chart",
  standalone: true,
  imports: [],
  template: `
    @if (hasData()) {
      <div
        [class]="containerClasses()"
        >
        <div class="flex-1 flex flex-col">
          <!-- Título do gráfico -->
          @if (showTitle()) {
            <h3 class="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
              <i class="fas fa-chart-pie text-brand-primary-500 dark:text-brand-primary-400"></i>
              <span>{{ title() }}</span>
            </h3>
          }
    
          <!-- Conteúdo do gráfico e legendas alinhados -->
          <div class="flex-1 flex flex-col gap-2" [class.mt-2]="!showTitle()">
            <!-- Canvas do gráfico - centrado com proporção mantida -->
            <div class="flex-1 flex justify-center items-center w-full pb-1">
              <div class="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
                <canvas
                  #pieCanvas
                  class="w-full h-auto cursor-pointer"
                  width="400"
                  height="400"
                  (mousemove)="onMouseMove($event)"
                  (mouseleave)="onMouseLeave()"
                ></canvas>
    
                <!-- Tooltip -->
                @if(hoveredSegment()) {
                  <div
                    class="absolute bg-gray-900 dark:bg-gray-700 text-white px-3 py-2 rounded-lg shadow-xl text-xs sm:text-sm font-medium pointer-events-none z-10 transition-all duration-200"
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
            </div>
    
            <!-- Legendas com percentuais - Grid compacto -->
            <div class="w-full grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1">
              @for (item of chartData(); track item) {
                @if (item.value > 0) {
                  <span
                    [class]="'px-2.5 py-1.5 rounded text-xs font-semibold shadow transition-transform hover:scale-105 cursor-default inline-flex items-center gap-1.5 truncate border border-opacity-30 dark:border-white ' + getTextColor(item.color)"
                    [style.background]="item.color"
                    [title]="item.label + ': ' + item.value + ' (' + item.percentage + '%)'"
                    >
                    <span class="font-bold text-xs flex-shrink-0">●</span>
                    <span class="text-xs truncate">{{ item.label }}: {{ item.value }}</span>
                  </span>
                }
              }
            </div>
          </div>
        </div>
      </div>
    }
    `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusPieChartComponent {
  private readonly i18n = inject(I18nService);
  
  @ViewChild('pieCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  // Signal para rastrear mudanças de modo dark
  isDarkMode = signal(document.documentElement.classList.contains('dark'));
  
  // Signals para controle de hover e tooltip
  hoveredSegment = signal<{label: string; value: number; percentage: string; color: string} | null>(null);
  tooltipPosition = signal<{x: number; y: number}>({x: 0, y: 0});
  private readonly animationProgress = signal(0);
  private readonly segmentOverlapAngle = 0.008; // small overlap to avoid visual gaps between slices
  private segments: Array<{startAngle: number; endAngle: number; item: any}> = [];
  
  constructor() {
    // Observar mudanças na classe 'dark' do documento
    const observer = new MutationObserver(() => {
      const newDarkMode = document.documentElement.classList.contains('dark');
      if (newDarkMode !== this.isDarkMode()) {
        this.isDarkMode.set(newDarkMode);
      }
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    // Effect que observa mudanças de título e dados
    effect(() => {
      console.log("[PieChart] Título recebido:", this.title());
      console.log("[PieChart] Data recebida:", this.data());
      
      // Usar setTimeout para garantir que o canvas está pronto
      setTimeout(() => {
        this.renderPieChart();
      }, 0);
    });
    
    // Effect que observa mudanças de modo dark para re-renderizar
    effect(() => {
      this.isDarkMode(); // Observar mudanças
      setTimeout(() => {
        this.renderPieChart();
      }, 0);
    });
  }
  
  title = input.required<string>();
  data = input<Record<string, number>>();
  labels = input<Record<string, string>>();
  createdDates = input<Record<string, string[]>>(); // Datas de criação por status para filtro
  appearance = input<"card" | "embedded">("card");
  showTitle = input<boolean>(true);

  readonly containerClasses = computed(() => {
    const variant = this.appearance();
    if (variant === "embedded") {
      return "w-full h-full flex flex-col";
    }
    return "w-full mobile-safe bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-5";
  });

  // Função para calcular luminância de uma cor e determinar se precisa de texto claro ou escuro
  getTextColor(hexColor: string): string {
    // Remover # se existir
    const color = hexColor.replace('#', '');
    
    // Converter hex para RGB
    const r = Number.parseInt(color.substring(0, 2), 16);
    const g = Number.parseInt(color.substring(2, 4), 16);
    const b = Number.parseInt(color.substring(4, 6), 16);
    
    // Calcular luminância usando a fórmula padrão
    const luminância = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Se luminância é alta (cor clara), retornar texto preto puro, caso contrário branco puro
    return luminância > 0.5 ? 'text-black' : 'text-white';
  }

  chartData = computed(() => {
    const d = this.data();
    const providedLabels = this.labels();
    
    // Verificação de segurança: retornar array vazio se data não existir
    if (!d) {
      console.warn('[PieChart] Data undefined:', { data: d });
      return [];
    }
    
    // Mapa de cores específico para cada status (garante consistência)
    const statusColorMap: Record<string, string> = {
      'Solicitado': '#FF3838', // Vermelho vibrante
      'Atribuído': '#FFA500', // Laranja vibrante
      'Aguardando Confirmação': '#6B5FFF', // Roxo vibrante
      'Aceito': '#00D4A6', // Teal vibrante
      'Recusado': '#FF4757', // Vermelho coral vibrante
      'Data Definida': '#00B8E6', // Ciano vibrante
      'Em Progresso': '#9B59B6', // Roxo magenta vibrante
      'Concluído': '#26A69A', // Teal claro vibrante
      'Cancelado': '#E74C3C', // Vermelho escuro vibrante
      'In Progress': '#9B59B6', // Roxo magenta vibrante
      'Unknown': '#95A5A6' // Cinza neutral
    };
    
    // Calcular total para percentuais
    const total = Object.values(d).reduce((sum, val) => sum + val, 0);
    
    const result = Object.entries(d).map(([status, value]) => {
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
      const color = statusColorMap[status] || '#9e9e9e'; // Cor padrão se status não for reconhecido
      return {
        label: providedLabels?.[status] || this.i18n.translate(status) || status,
        value,
        percentage,
        color,
      };
    });
    
    return result;
  });

  // Verificar se há dados para mostrar o gráfico
  hasData = computed(() => {
    const data = this.chartData();
    return data?.some(item => item.value > 0) ?? false;
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
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
    
    // Verificar se está dentro do anel do donut
    const outerRadius = 110;
    const innerRadius = 68;
    
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

  private drawNoDataState(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, outerRadius: number, innerRadius: number): void {
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = "#e5e7eb";
    ctx.fill();
    
    const isDarkMode = document.documentElement.classList.contains('dark');
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = isDarkMode ? "#FFFFFF" : "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const noDataText = this.i18n.translate("noDataAvailable") || "Sem dados";
    ctx.fillText(noDataText, centerX, centerY);
  }

  private drawSegments(ctx: CanvasRenderingContext2D, config: {
    visibleData: any[];
    total: number;
    centerX: number;
    centerY: number;
    outerRadius: number;
    innerRadius: number;
    progress: number;
  }): number {
    let startAngle = -Math.PI / 2;
    this.segments = [];
    const overlapMagnitude = config.progress >= 0.98
      ? this.segmentOverlapAngle
      : this.segmentOverlapAngle * Math.max(config.progress, 0.2);
    
    config.visibleData.forEach((item, index) => {
      const sliceAngle = (item.value / config.total) * 2 * Math.PI;
      const animatedSliceAngle = sliceAngle * config.progress;
      if (animatedSliceAngle <= 0) {
        startAngle += animatedSliceAngle;
        return;
      }
      const baseEndAngle = startAngle + animatedSliceAngle;
      const overlapLimit = Math.min(0.03, Math.max(overlapMagnitude, 0.008));
      const startWithOverlap = startAngle - overlapLimit;
      const endWithOverlap = baseEndAngle + overlapLimit;
      
      this.segments.push({
        startAngle: startWithOverlap + Math.PI / 2,
        endAngle: endWithOverlap + Math.PI / 2,
        item
      });
      
      const isHovered = this.hoveredSegment()?.label === item.label;
      const outerRadius = isHovered ? config.outerRadius + 4 : config.outerRadius;
      const innerRadius = Math.max(6, isHovered ? config.innerRadius - 3 : config.innerRadius);
      
      ctx.beginPath();
      ctx.arc(config.centerX, config.centerY, outerRadius, startWithOverlap, endWithOverlap);
      ctx.arc(config.centerX, config.centerY, innerRadius, endWithOverlap, startWithOverlap, true);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = item.color;
      ctx.stroke();
      
      startAngle += animatedSliceAngle;
    });
    
    return startAngle;
  }

  private drawCenterText(ctx: CanvasRenderingContext2D, total: number, centerX: number, centerY: number, canvasWidth: number, progress: number): void {
    if (progress < 0.9) return;
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.beginPath();
    const bgRadius = canvasWidth < 350 ? 30 : 38;
    ctx.arc(centerX, centerY, bgRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    const isDarkMode = document.documentElement.classList.contains('dark');
    const totalColor = isDarkMode ? "#FFFFFF" : "#000000";
    
    const fontSize = canvasWidth < 350 ? 20 : 28;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = totalColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(total.toString(), centerX, centerY - (canvasWidth < 350 ? 6 : 8));
    
    const labelSize = canvasWidth < 350 ? 10 : 12;
    ctx.font = `${labelSize}px sans-serif`;
    ctx.fillStyle = totalColor;
    ctx.fillText(this.i18n.translate("total") || "Total", centerX, centerY + (canvasWidth < 350 ? 10 : 14));
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
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";
    ctx.miterLimit = 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    
    const data = this.chartData();
    const visibleData = data.filter((item) => item.value > 0);
    const total = visibleData.reduce((sum, item) => sum + item.value, 0);
    
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    const outerRadius = canvasWidth < 350 ? 70 : 90;
    const innerRadius = canvasWidth < 350 ? 45 : 55;
    
    if (total === 0 || visibleData.length === 0) {
      this.drawNoDataState(ctx, centerX, centerY, outerRadius, innerRadius);
      return;
    }
    
    const progress = this.animationProgress();
    
    this.drawSegments(ctx, {
      visibleData,
      total,
      centerX,
      centerY,
      outerRadius,
      innerRadius,
      progress
    });
    this.drawCenterText(ctx, total, centerX, centerY, canvasWidth, progress);
  }
}
