import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from "@angular/core";


@Component({
  selector: "app-status-serial-chart",
  standalone: true,
  imports: [],
  template: `
    <div class="w-full p-4">
      <h3 class="text-lg font-semibold mb-2">{{ title }}</h3>
      @if (chartData().length > 0) {
        <div class="flex items-end gap-2 h-40">
          @for (item of chartData(); track item) {
            <div class="flex flex-col items-center justify-end h-full">
              <div
                class="bg-red-500 rounded-t w-8"
                [style.height]="item.value * scale + 'px'"
                [style.background]="'#FF3838'"
                [title]="item.label + ': ' + item.value"
              ></div>
              <span class="text-xs mt-1 text-center break-words max-w-[64px]">{{
                item.label
              }}</span>
              <span class="text-xs text-gray-600">{{ item.value }}</span>
            </div>
          }
        </div>
      } @else {
        <div class="text-center text-gray-400 py-8">
          Nenhum dado para exibir
        </div>
      }
    </div>
    `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusSerialChartComponent {
  ngOnInit() {
    console.log(
      "StatusSerialChartComponent - dados recebidos:",
      this.data(),
      this.labels()
    );
  }
  title = input<string>("Total de Serviços por Status");
  data = input<Record<string, number>>();
  labels = input<Record<string, string>>(); // Para internacionalização

  chartData = computed(() => {
    const d = this.data();
    const l = this.labels();
    return Object.entries(d).map(([status, value]) => ({
      label: l[status] || status,
      value,
    }));
  });

  // Escala para altura das barras
  get scale() {
    const max = Math.max(...Object.values(this.data()));
    return max > 0 ? 100 / max : 1;
  }
}

