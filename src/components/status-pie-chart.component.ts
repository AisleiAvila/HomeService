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
import { FormsModule } from "@angular/forms";
import { I18nService } from "../i18n.service";
import { I18nPipe } from "../pipes/i18n.pipe";

@Component({
  selector: "app-status-pie-chart",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  template: `
    <div
      class="w-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6 mobile-safe flex flex-col items-center gap-1.5"
    >
      <!-- Filtro de Período -->
      <div class="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 mb-3">
        <h3 class="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center shrink-0">
          <i class="fas fa-chart-pie text-brand-primary-500 dark:text-brand-primary-400 mr-1.5 text-xs sm:text-sm"></i>
          {{ title() }}
        </h3>
        <select
          [(ngModel)]="selectedPeriod"
          (ngModelChange)="onPeriodChange()"
          class="w-full sm:w-auto px-2 py-1 text-xs sm:text-xs md:text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-brand-primary-500"
        >
          <option value="all">{{ 'allTime' | i18n }}</option>
          <option value="7">{{ 'last7Days' | i18n }}</option>
          <option value="30">{{ 'last30Days' | i18n }}</option>
          <option value="90">{{ 'last90Days' | i18n }}</option>
        </select>
      </div>

      <div class="w-full mx-auto flex justify-center items-center relative max-w-full overflow-auto">
        <canvas
          #pieCanvas
          class="w-full h-auto aspect-square cursor-pointer max-w-xs sm:max-w-sm md:max-w-md lg:max-w-2xl"
          width="500"
          height="500"
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
      
      <!-- Legendas com percentuais - Grid responsivo melhorado -->
      <div class="w-full grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-1.5 sm:gap-2 justify-items-center mt-1.5">
        <ng-container *ngFor="let item of chartData()">
          @if (item.value > 0) {
            <span
              class="px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 md:py-2 rounded-lg text-xs sm:text-xs md:text-sm font-semibold shadow-md border border-opacity-30 border-white transition-transform hover:scale-110 cursor-default inline-flex items-center gap-1 sm:gap-1.5 whitespace-normal break-words text-white line-clamp-2"
              [style.background]="item.color"
              [style.color]="'white'"
            >
              <span class="font-bold text-xs sm:text-xs md:text-sm">●</span>
              <span class="text-xs sm:text-xs md:text-sm">{{ item.label }}: {{ item.value }} ({{ item.percentage }}%)</span>
            </span>
          }
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
  private readonly animationProgress = signal(0);
  private segments: Array<{startAngle: number; endAngle: number; item: any}> = [];
  
  // Signal para controle de período
  selectedPeriod = signal<'all' | '7' | '30' | '90'>('all');

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
  createdDates = input<Record<string, string[]>>(); // Datas de criação por status para filtro

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
      'Aguardando Finalização': '#34495E', // Cinza escuro
      'Pagamento Feito': '#00C853', // Verde vibrante
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
    
    // Aplicar devicePixelRatio para melhorar nitidez em displays de alta densidade
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Reset do estado do contexto
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Usa todos os itens da legenda, mesmo com valor zero
    const data = this.chartData();
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Responsive raio baseado no tamanho
    const isSmallScreen = rect.width < 300;
    const outerRadius = isSmallScreen ? 80 : 110;
    const innerRadius = isSmallScreen ? 50 : 68;
    
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
    
    // Filtrar apenas itens com valor > 0 para evitar lacunas no donut
    const visibleData = data.filter(item => item.value > 0);
    
    // Renderizar segmentos do donut
    visibleData.forEach((item) => {
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
      
      // Desenhar segmento do donut
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentOuterRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      
      // Cores sólidas para cada segmento
      ctx.fillStyle = item.color;
      ctx.fill();
      
      startAngle = endAngle;
    });
    
    // Desenhar total no centro do donut
    if (progress >= 1) {
      // Background semi-transparente menor para mobile
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.beginPath();
      const bgRadius = isSmallScreen ? 24 : 32;
      ctx.arc(centerX, centerY, bgRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Número total em branco brilhante - menor no mobile
      const fontSize = isSmallScreen ? "18px" : "24px";
      ctx.font = `bold ${fontSize} sans-serif`;
      ctx.fillStyle = "#FFFFFF"; // Branco puro para melhor visibilidade
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(total.toString(), centerX, centerY - (isSmallScreen ? 4 : 6));
      
      // Label "Total" em branco com menor opacidade
      const labelSize = isSmallScreen ? "9px" : "12px";
      ctx.font = `${labelSize} sans-serif`;
      ctx.fillStyle = "#E0E0E0"; // Branco levemente acinzentado
      ctx.fillText(this.i18n.translate("total") || "Total", centerX, centerY + (isSmallScreen ? 8 : 12));
    }
  }
}
