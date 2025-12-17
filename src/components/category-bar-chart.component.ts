import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  effect,
  AfterViewInit,
  inject,
  signal,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { I18nService } from "@/src/i18n.service";
import { I18nPipe } from "../pipes/i18n.pipe";

@Component({
  selector: "app-category-bar-chart",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  template: `
    <div
      class="w-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-6 mobile-safe flex flex-col"
    >
      <!-- Filtro de Período -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
          {{ title() }}
        </h3>
        <select
          [(ngModel)]="selectedPeriod"
          (ngModelChange)="onPeriodChange()"
          class="w-full sm:w-auto px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-brand-primary-500"
        >
          <option value="all">{{ 'allTime' | i18n }}</option>
          <option value="7">{{ 'last7Days' | i18n }}</option>
          <option value="30">{{ 'last30Days' | i18n }}</option>
          <option value="90">{{ 'last90Days' | i18n }}</option>
        </select>
      </div>
      
      <!-- Canvas com scroll horizontal - otimizado para mobile -->
      <div class="w-full overflow-x-auto overflow-y-hidden -mx-3 sm:mx-0 px-3 sm:px-0" style="max-width: 100%;">
        <div [style.min-width.px]="canvasMinWidth()" class="flex justify-center items-center py-1 sm:py-2">
          <canvas
            #barCanvas
            [width]="canvasWidth()"
            [height]="canvasHeight()"
            class="w-full"
            [style.height.px]="canvasHeight()"
          ></canvas>
        </div>
      </div>
      
      <!-- Legendas com valores - responsivo -->
      <div class="flex flex-wrap gap-1.5 sm:gap-2 justify-center mt-4 sm:mt-6 w-full">
        <ng-container *ngFor="let item of sortedChartData()">
          <span
            class="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-semibold shadow-sm border border-opacity-20 border-gray-700 transition-transform hover:scale-105 cursor-default"
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
  
  @ViewChild('barCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  // Signal para controle de período
  selectedPeriod = signal<'all' | '7' | '30' | '90'>('all');
  private readonly animationProgress = signal(0);
  
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
  createdDates = input<Record<string, string[]>>(); // Datas de criação por categoria para filtro

  chartData = computed(() => {
    const d = this.data();
    const providedLabels = this.labels();
    
    // Verificação de segurança: retornar array vazio se data não existir
    if (!d) {
      console.warn('[BarChart] Data undefined:', { data: d });
      return [];
    }
    
    // Cores da identidade visual da marca (baseado no Design System Natan)
    const colors = [
      "#ea5455", // brand-primary - Vermelho Natan
      "#0f766e", // teal-700 - Verde-azulado
      "#7c3aed", // violet-600 - Violeta elegante
      "#0891b2", // cyan-600 - Ciano corporativo
      "#f59e0b", // amber-500 - Âmbar
      "#059669", // emerald-600 - Verde esmeralda
      "#475569", // slate-600 - Cinza ardósia
      "#ef4444", // red-500 - Vermelho
      "#0369a1", // sky-700 - Azul céu escuro
      "#9e9e9e", // brand-accent - Cinza secundária
    ];
    
    let i = 0;
    return Object.entries(d).map(([category, value]) => ({
      category,
      label: providedLabels?.[category] || this.i18n.translate(category) || category,
      value,
      color: colors[i++ % colors.length],
    }));
  });
  
  // Dados ordenados do maior para o menor
  sortedChartData = computed(() => {
    return [...this.chartData()].sort((a, b) => b.value - a.value);
  });
  
  // Largura mínima do canvas baseada no número de categorias
  canvasMinWidth = computed(() => {
    const count = this.sortedChartData().length;
    const isMobile = globalThis.window != null && globalThis.window.innerWidth < 640;
    // Mobile: 60px por barra, mínimo 300px / Desktop: 80px por barra, mínimo 400px
    return isMobile ? Math.max(300, count * 60) : Math.max(400, count * 80);
  });
  
  // Largura do canvas ajustada
  canvasWidth = computed(() => {
    return this.canvasMinWidth();
  });
  
  // Altura do canvas responsiva
  canvasHeight = computed(() => {
    const isMobile = globalThis.window != null && globalThis.window.innerWidth < 640;
    return isMobile ? 180 : 320;
  });

  ngAfterViewInit() {
    // Iniciar animação suave ao carregar
    this.animateChart();
  }
  
  onPeriodChange() {
    // Quando o período muda, animar novamente
    this.animationProgress.set(0);
    this.animateChart();
  }
  
  // Animação suave ao carregar o gráfico
  private animateChart() {
    const duration = 800; // ms
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      this.animationProgress.set(1 - Math.pow(1 - progress, 3));
      
      this.renderBarChart();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  renderBarChart() {
    if (!this.canvasRef) {
      console.warn("[BarChart] Canvas ref não encontrado");
      return;
    }
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("[BarChart] Contexto 2D não encontrado");
      return;
    }

    // Usar dados ordenados (do maior para o menor)
    const data = this.sortedChartData();
    const total = data.reduce((sum, item) => sum + item.value, 0);

    this.setupCanvasResolution(canvas, ctx);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (total === 0) {
      this.drawNoDataMessage(ctx, canvas.width, canvas.height);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    const chartDimensions = this.calculateChartDimensions(displayWidth, displayHeight);
    const normalizeValue = this.getNormalizeFunction(data);
    const barDimensions = this.calculateBarDimensions(displayWidth, data.length, chartDimensions.isMobile);

    console.log('[CategoryBarChart] Renderizando:', {
      dataLength: data.length,
      displayWidth,
      barWidth: barDimensions.barWidth,
      actualBarWidth: barDimensions.actualBarWidth,
      data: data.map(d => ({ label: d.label, value: d.value }))
    });

    this.drawBars(ctx, data, normalizeValue, barDimensions, chartDimensions);
    this.drawGridLines(ctx, data, chartDimensions, displayWidth);
  }

  private setupCanvasResolution(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const dpr = globalThis.window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      ctx.scale(dpr, dpr);
    }
  }

  private drawNoDataMessage(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "#6b7280";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const i18nText = this.i18n.translate("noDataAvailable") || "Sem dados";
    ctx.fillText(i18nText, width / 2, height / 2);
  }

  private calculateChartDimensions(displayWidth: number, displayHeight: number) {
    const isMobile = globalThis.window != null && globalThis.window.innerWidth < 640;
    const topMargin = isMobile ? 25 : 35;
    const bottomMargin = isMobile ? 50 : 80;
    
    return {
      isMobile,
      topMargin,
      bottomMargin,
      chartHeight: displayHeight - topMargin - bottomMargin,
      chartTop: topMargin,
      chartBottom: displayHeight - bottomMargin,
    };
  }

  private calculateBarDimensions(displayWidth: number, dataLength: number, isMobile: boolean) {
    const barWidth = displayWidth / dataLength;
    const barSpacing = isMobile ? 6 : 8;
    const minBarWidth = isMobile ? 30 : 40;
    const maxBarWidth = barWidth - barSpacing;
    const actualBarWidth = Math.min(Math.max(maxBarWidth, minBarWidth), barWidth * 0.8);
    
    return { barWidth, barSpacing, actualBarWidth, isMobile };
  }

  private getNormalizeFunction(data: any[]) {
    const maxValue = Math.max(...data.map((item) => item.value));
    const minValue = Math.min(...data.map((item) => item.value));
    const useLogScale = maxValue / Math.max(minValue, 1) > 10;
    
    return (value: number): number => {
      if (useLogScale && value > 0) {
        const logMax = Math.log(maxValue + 1);
        const logValue = Math.log(value + 1);
        return logValue / logMax;
      }
      return value / maxValue;
    };
  }

  private drawBars(
    ctx: CanvasRenderingContext2D,
    data: any[],
    normalizeValue: (value: number) => number,
    barDimensions: any,
    chartDimensions: any
  ) {
    const progress = this.animationProgress();
    let index = 0;

    for (const item of data) {
      const normalizedValue = normalizeValue(item.value);
      const barHeight = normalizedValue * chartDimensions.chartHeight * progress;
      const x = index * barDimensions.barWidth + barDimensions.barSpacing / 2;
      const y = chartDimensions.chartBottom - barHeight;

      this.drawBar(ctx, item, x, y, barDimensions.actualBarWidth, barHeight);
      
      if (progress >= 1) {
        this.drawBarValue(ctx, item.value, x, y, barDimensions.actualBarWidth, barDimensions.isMobile);
        this.drawBarLabel(ctx, item.label, x, y, barDimensions, chartDimensions, data.length);
      }
      
      index++;
    }
  }

  private drawBar(
    ctx: CanvasRenderingContext2D,
    item: any,
    x: number,
    y: number,
    barWidth: number,
    barHeight: number
  ) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
    gradient.addColorStop(0, item.color);
    gradient.addColorStop(1, this.darkenColor(item.color, 20));
    
    this.roundRect(ctx, x, y, barWidth, barHeight, 6);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
    
    ctx.strokeStyle = this.lightenColor(item.color, 10);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 3, y);
    ctx.lineTo(x + barWidth - 3, y);
    ctx.stroke();
  }

  private drawBarValue(
    ctx: CanvasRenderingContext2D,
    value: number,
    x: number,
    y: number,
    barWidth: number,
    isMobile: boolean
  ) {
    const fontSize = isMobile ? 11 : 13;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    
    const text = value.toString();
    const textMetrics = ctx.measureText(text);
    const textHeight = isMobile ? 14 : 16;
    const padding = isMobile ? 3 : 4;
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    this.roundRect(
      ctx,
      x + barWidth / 2 - textMetrics.width / 2 - padding,
      y - textHeight - padding - 4,
      textMetrics.width + padding * 2,
      textHeight + padding,
      4
    );
    ctx.fill();
    
    ctx.fillStyle = "#111827";
    ctx.fillText(text, x + barWidth / 2, y - 6);
  }

  private drawBarLabel(
    ctx: CanvasRenderingContext2D,
    label: string,
    x: number,
    y: number,
    barDimensions: any,
    chartDimensions: any,
    dataLength: number
  ) {
    ctx.save();
    ctx.translate(x + barDimensions.actualBarWidth / 2, chartDimensions.chartBottom + 10);
    
    const shouldRotate = dataLength > 6 || barDimensions.isMobile;
    if (shouldRotate) {
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = "right";
    } else {
      ctx.textAlign = "center";
    }
    
    const labelFontSize = barDimensions.isMobile ? 9 : 11;
    ctx.font = `${labelFontSize}px sans-serif`;
    ctx.fillStyle = "#4b5563";
    ctx.textBaseline = "top";
    
    const maxLength = barDimensions.isMobile ? 12 : 15;
    const truncatedLabel = label.length > maxLength 
      ? label.substring(0, maxLength) + '...' 
      : label;
    
    ctx.fillText(truncatedLabel, 0, 0);
    ctx.restore();
  }

  private drawGridLines(
    ctx: CanvasRenderingContext2D,
    data: any[],
    chartDimensions: any,
    displayWidth: number
  ) {
    const maxValue = Math.max(...data.map((item) => item.value));
    const progress = this.animationProgress();
    
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = chartDimensions.chartTop + (chartDimensions.chartHeight * i / gridLines);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(displayWidth, y);
      ctx.stroke();
      
      if (progress >= 1) {
        const value = Math.round(maxValue * (1 - i / gridLines));
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(value.toString(), displayWidth - 5, y);
      }
    }
  }
  
  // Função auxiliar para desenhar retângulos com cantos arredondados
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  
  // Função para escurecer uma cor
  private darkenColor(color: string, percent: number): string {
    const num = Number.parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
  
  // Função para clarear uma cor
  private lightenColor(color: string, percent: number): string {
    const num = Number.parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min((num >> 16) + amt, 255);
    const G = Math.min((num >> 8 & 0x00FF) + amt, 255);
    const B = Math.min((num & 0x0000FF) + amt, 255);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
}
