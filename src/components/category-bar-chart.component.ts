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

import { FormsModule } from "@angular/forms";
import { I18nService } from "@/src/i18n.service";

@Component({
  selector: "app-category-bar-chart",
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (hasData()) {
      <div
        class="w-full bg-linear-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6 mobile-safe flex flex-col items-center gap-1.5"
        >
        <!-- Filtro de Período -->
        <div class="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 mb-3">
          <h3 class="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center shrink-0">
            <i [class]="icon() + ' text-brand-primary-500 mr-1.5 text-xs sm:text-sm'"></i>
            {{ title() }}
          </h3>
        </div>
    
        <!-- Legenda de Cores para Pago/Pendente -->
        @if (showPaidPendingLegend()) {
          <div class="w-full flex gap-3 justify-center mb-2 flex-wrap">
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-3 rounded" style="background-color: #00C853;"></div>
              <span class="text-xs text-gray-700 dark:text-gray-300">Pago</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-3 rounded" style="background-color: #FFA500;"></div>
              <span class="text-xs text-gray-700 dark:text-gray-300">Pendente</span>
            </div>
          </div>
        }
    
        <!-- Canvas com scroll horizontal - otimizado para mobile -->
        <div class="w-full overflow-x-auto overflow-y-hidden" style="max-width: 100%; margin: 0 -12px; padding: 0 12px;">
          <div [style.min-width.px]="canvasMinWidth()" class="flex justify-center items-center py-1">
            <canvas
              #barCanvas
              [width]="canvasWidth()"
              [height]="canvasHeight()"
              class="w-full"
              [style.height.px]="canvasHeight()"
            ></canvas>
          </div>
        </div>
    
        <!-- Legendas com valores - Grid responsivo melhorado -->
        <div class="w-full grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 justify-items-center mt-1.5 px-1">
          @for (item of sortedChartData(); track item) {
            @if (item.value > 0) {
              <span
                class="px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 md:py-2 rounded-lg text-xs sm:text-xs md:text-sm font-semibold shadow-lg border border-opacity-50 transition-transform hover:scale-110 cursor-default inline-flex items-center gap-1 sm:gap-1.5 whitespace-normal wrap-break-word line-clamp-2 max-w-full dark:border-white dark:border-opacity-30 border-gray-200"
                [class]="'px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 md:py-2 rounded-lg text-xs sm:text-xs md:text-sm font-semibold shadow-lg border border-opacity-50 transition-transform hover:scale-110 cursor-default inline-flex items-center gap-1 sm:gap-1.5 whitespace-normal wrap-break-word line-clamp-2 max-w-full dark:border-white dark:border-opacity-30 border-gray-200 ' + getTextColor(item.color)"
                [style.background]="item.color"
                >
                <span class="font-bold text-xs sm:text-xs md:text-sm shrink-0">●</span>
                <span class="text-xs sm:text-xs md:text-sm truncate">{{ item.label }}: {{ formatValue(item.value) }}</span>
              </span>
            }
          }
        </div>
      </div>
    }
    `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBarChartComponent implements AfterViewInit {
  readonly i18n = inject(I18nService);
  
  @ViewChild('barCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private readonly animationProgress = signal(0);
  
  // Signal para rastrear mudanças de modo dark
  isDarkMode = signal(globalThis.window && 
    globalThis.document?.documentElement?.classList?.contains('dark'));
  
  constructor() {
    // Observar mudanças na classe 'dark' do documento
    if (globalThis.window && globalThis.document) {
      const observer = new MutationObserver(() => {
        const newDarkMode = globalThis.document?.documentElement?.classList?.contains('dark');
        if (newDarkMode !== this.isDarkMode()) {
          this.isDarkMode.set(newDarkMode);
        }
      });
      
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
    
    // Effect que observa mudanças de título, dados e período
    // Este effect é acionado sempre que qualquer um desses inputs muda
    effect(() => {
      console.log("[BarChart] Título recebido:", this.title());
      console.log("[BarChart] Dados recebidos:", this.data());
      console.log("[BarChart] Período:", this.selectedPeriodInput());
      
      // Usar setTimeout para garantir que o canvas está pronto
      setTimeout(() => {
        this.renderBarChart();
      }, 0);
    });
    
    // Effect que observa mudanças de modo dark para re-renderizar
    effect(() => {
      this.isDarkMode(); // Observar mudanças
      setTimeout(() => {
        this.renderBarChart();
      }, 0);
    });
  }

  title = input.required<string>();
  icon = input<string>('fas fa-chart-bar');
  data = input<Record<string, number>>();
  labels = input<Record<string, string>>();
  showPaidPendingLegend = input<boolean>(false);
  selectedPeriodInput = input<'all' | '7' | '30' | '90' | 'custom'>('all');

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
    
    if (!d) {
      console.warn('[BarChart] Data undefined');
      return [];
    }
    
    let colorIndex = 0;
    return Object.entries(d).map(([category, value]) => {
      const isPaid = category.includes('Pago') || category.includes('Paid');
      const isPending = category.includes('Pendente') || category.includes('Pending');
      
      let color: string;
      if (isPaid) {
        color = "#00C853";
      } else if (isPending) {
        color = "#FFA500";
      } else {
        const colors = [
          "#FF3838", "#00D4A6", "#6B5FFF", "#00B8E6",
          "#34495E", "#FF4757", "#0084FF", "#95A5A6",
        ];
        color = colors[colorIndex % colors.length];
      }
      colorIndex++;
      
      return {
        category,
        label: providedLabels?.[category] || this.i18n.translate(category) || category,
        value,
        color: color,
      };
    });
  });
  
  sortedChartData = computed(() => {
    return [...this.chartData()].sort((a, b) => b.value - a.value);
  });

  // Verificar se há dados para mostrar o gráfico
  hasData = computed(() => {
    const data = this.chartData();
    return data?.some(item => item.value > 0) ?? false;
  });

  groupedChartData = computed(() => {
    const data = this.sortedChartData();
    const groups: Record<string, any[]> = {};
    
    data.forEach(item => {
      const baseCategoryRegex = /^(.+?)\s*-\s*(Pago|Pagado|Paid|Pendente|Pending)/i;
      const baseCategoryMatch = baseCategoryRegex.exec(item.label);
      const baseCategory = baseCategoryMatch ? baseCategoryMatch[1].trim() : item.label;
      
      if (!groups[baseCategory]) {
        groups[baseCategory] = [];
      }
      groups[baseCategory].push(item);
    });
    
    return Object.entries(groups).map(([category, items]) => ({
      category,
      items: [...items].sort((a, b) => {
        const aIsPaid = a.label.includes('Pago') || a.label.includes('Paid');
        const bIsPaid = b.label.includes('Pago') || b.label.includes('Paid');
        if (aIsPaid && !bIsPaid) return -1;
        if (!aIsPaid && bIsPaid) return 1;
        return 0;
      })
    }));
  });

  canvasMinWidth = computed(() => {
    const groups = this.groupedChartData();
    const isMobile = globalThis.window != null && globalThis.window.innerWidth < 640;
    const isTablet = globalThis.window != null && globalThis.window.innerWidth < 1024;
    
    let totalBars = 0;
    groups.forEach(group => {
      totalBars += group.items.length > 1 ? group.items.length + 1 : 1;
    });
    
    let barSize: number;
    if (isMobile) {
      barSize = 50;
    } else if (isTablet) {
      barSize = 60;
    } else {
      barSize = 70;
    }

    let minWidth: number;
    if (isMobile) {
      minWidth = 240;
    } else if (isTablet) {
      minWidth = 280;
    } else {
      minWidth = 320;
    }

    return Math.max(minWidth, groups.length * barSize);
  });
  
  canvasWidth = computed(() => {
    return this.canvasMinWidth();
  });
  
  canvasHeight = computed(() => {
    const isMobile = globalThis.window != null && globalThis.window.innerWidth < 640;
    const isTablet = globalThis.window != null && globalThis.window.innerWidth < 1024;
    
    if (isMobile) {
      return 140;
    } else if (isTablet) {
      return 200;
    } else {
      return 320;
    }
  });

  ngAfterViewInit() {
    this.animateChart();
  }

  formatValue(value: number): string {
    return value.toFixed(2);
  }
  
  private animateChart() {
    const duration = 800;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
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
      return;
    }
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const groups = this.groupedChartData();
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

    this.drawGroupedBars(ctx, groups, normalizeValue, chartDimensions, displayWidth);
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
    const isDarkMode = globalThis.window && 
      globalThis.document?.documentElement?.classList?.contains('dark');
    ctx.fillStyle = isDarkMode ? "#FFFFFF" : "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const i18nText = this.i18n.translate("noDataAvailable") || "Sem dados";
    ctx.fillText(i18nText, width / 2, height / 2);
  }

  private drawGroupedBars(
    ctx: CanvasRenderingContext2D,
    groups: any[],
    normalizeValue: (value: number) => number,
    chartDimensions: any,
    displayWidth: number
  ) {
    const progress = this.animationProgress();
    const isMobile = chartDimensions.isMobile;
    
    const groupSpacing = displayWidth / groups.length;
    const barWidthPerGroup = groupSpacing * 0.7;
    
    let groupIndex = 0;
    
    for (const group of groups) {
      const groupCenterX = (groupIndex + 0.5) * groupSpacing;
      const barsInGroup = group.items.length;
      const singleBarWidth = barWidthPerGroup / barsInGroup;
      
      for (let barIndex = 0; barIndex < barsInGroup; barIndex++) {
        const item = group.items[barIndex];
        const normalizedValue = normalizeValue(item.value);
        const barHeight = normalizedValue * chartDimensions.chartHeight * progress;
        
        const x = groupCenterX - barWidthPerGroup / 2 + barIndex * singleBarWidth;
        const y = chartDimensions.chartBottom - barHeight;
        
        this.drawBar(ctx, item, x, y, singleBarWidth - 1, barHeight);
        
        if (progress >= 1) {
          this.drawBarValue(ctx, item.value, x, y, singleBarWidth, isMobile);
        }
      }
      
      if (progress >= 1) {
        this.drawGroupLabel(ctx, group.category, groupCenterX, chartDimensions, displayWidth, groups.length);
      }
      
      groupIndex++;
    }
  }

  private drawGroupLabel(
    ctx: CanvasRenderingContext2D,
    label: string,
    centerX: number,
    chartDimensions: any,
    displayWidth: number,
    groupCount: number
  ) {
    ctx.save();
    ctx.translate(centerX, chartDimensions.chartBottom + 12);
    ctx.textAlign = "center";
    
    const labelFontSize = chartDimensions.isMobile ? 8 : 9;
    ctx.font = `bold ${labelFontSize}px sans-serif`;
    
    const isDarkMode = globalThis.window && 
      globalThis.document?.documentElement?.classList?.contains('dark');
    ctx.fillStyle = isDarkMode ? "#FFFFFF" : "#000000";
    ctx.textBaseline = "top";
    
    const maxLength = chartDimensions.isMobile ? 12 : 15;
    const truncatedLabel = label.length > maxLength 
      ? label.substring(0, maxLength) + '...' 
      : label;
    
    ctx.fillText(truncatedLabel, 0, 0);
    ctx.restore();
  }

  private calculateChartDimensions(displayWidth: number, displayHeight: number) {
    const isMobile = globalThis.window != null && globalThis.window.innerWidth < 640;
    const isTablet = globalThis.window != null && globalThis.window.innerWidth < 1024;
    
    let topMargin: number;
    if (isMobile) {
      topMargin = 15;
    } else if (isTablet) {
      topMargin = 25;
    } else {
      topMargin = 35;
    }
    
    let bottomMargin: number;
    if (isMobile) {
      bottomMargin = 40;
    } else if (isTablet) {
      bottomMargin = 60;
    } else {
      bottomMargin = 80;
    }
    
    return {
      isMobile,
      topMargin,
      bottomMargin,
      chartHeight: displayHeight - topMargin - bottomMargin,
      chartTop: topMargin,
      chartBottom: displayHeight - bottomMargin,
    };
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
    const fontSize = isMobile ? 9 : 11;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    
    const text = this.formatValue(value);
    const textMetrics = ctx.measureText(text);
    const textHeight = isMobile ? 12 : 14;
    const padding = isMobile ? 2 : 3;
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    this.roundRect(
      ctx,
      x + barWidth / 2 - textMetrics.width / 2 - padding,
      y - textHeight - padding - 3,
      textMetrics.width + padding * 2,
      textHeight + padding,
      3
    );
    ctx.fill();
    
    ctx.fillStyle = "#111827";
    ctx.fillText(text, x + barWidth / 2, y - 4);
  }

  private drawGridLines(
    ctx: CanvasRenderingContext2D,
    data: any[],
    chartDimensions: any,
    displayWidth: number
  ) {
    const maxValue = Math.max(...data.map((item) => item.value));
    const progress = this.animationProgress();
    const isMobile = globalThis.window != null && globalThis.window.innerWidth < 640;
    
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 0.5;
    
    const gridLines = isMobile ? 3 : 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = chartDimensions.chartTop + (chartDimensions.chartHeight * i / gridLines);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(displayWidth, y);
      ctx.stroke();
      
      if (progress >= 1) {
        const value = Math.round(maxValue * (1 - i / gridLines));
        const fontSize = isMobile ? 7.5 : 9;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = "#6b7280";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(value.toString(), displayWidth - 3, y);
      }
    }
  }
  
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
  
  private darkenColor(color: string, percent: number): string {
    const num = Number.parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
  
  private lightenColor(color: string, percent: number): string {
    const num = Number.parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min((num >> 16) + amt, 255);
    const G = Math.min((num >> 8 & 0x00FF) + amt, 255);
    const B = Math.min((num & 0x0000FF) + amt, 255);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
}
