import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  viewChild,
  Injector,
  runInInjectionContext,
  OnDestroy,
  signal,
  computed,
  AfterViewInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  User,
  ServiceRequest,
  ServiceStatus,
} from "@/src/models/maintenance.models";
import { StatusUtilsService } from "@/src/utils/status-utils.service";
import { DataService } from "../../services/data.service";
import { I18nPipe } from "../../pipes/i18n.pipe";
import {
  FullCalendarModule,
  FullCalendarComponent,
} from "@fullcalendar/angular";
import {
  CalendarOptions,
  EventClickArg,
  CalendarApi,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import ptBr from "@fullcalendar/core/locales/pt-br";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import { I18nService } from "@/src/i18n.service";

@Component({
  selector: "app-schedule",
  standalone: true,
  imports: [CommonModule, FullCalendarModule, I18nPipe],
  templateUrl: "./schedule.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "block h-full font-sans",
  },
})
export class ScheduleComponent implements OnDestroy, AfterViewInit {
  public toggleStatusDropdown() {
    this.showStatusDropdown.update((v) => !v);
  }
  // Atualiza os status visíveis conforme seleção do <select multiple>
  public onStatusMultiSelectChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const selected: ServiceStatus[] = [];
    for (const option of Array.from(select.options)) {
      if (option.selected) {
        selected.push(option.value as ServiceStatus);
      }
    }
    this.visibleStatuses.set(new Set(selected));
  }
  // Controla a exibição do dropdown customizado
  showStatusDropdown = signal(false);

  // Retorna os status selecionados como array
  public selectedStatuses(): ServiceStatus[] {
    return Array.from(this.visibleStatuses());
  }

  // Retorna os status selecionados formatados para exibir na combo
  public getSelectedStatusLabel(): string {
    return this.i18n.translate("selectStatus");
  }
  user = input.required<User>();
  viewDetails = output<ServiceRequest>();

  private readonly dataService = inject(DataService);
  readonly i18n = inject(I18nService);
  private readonly injector = inject(Injector);
  private resizeHandler?: () => void;

  calendarComponent = viewChild.required<FullCalendarComponent>("calendar");
  private readonly calendarApi = signal<CalendarApi | undefined>(undefined);

  visibleStatuses = signal<Set<ServiceStatus>>(new Set());
  isFilterVisible = signal(false);

  // Font classes for dashboard standardization
  public fontHeading =
    "font-heading text-2xl font-bold text-gray-900 dark:text-gray-100";
  public fontSubheading =
    "font-heading text-lg font-semibold text-gray-800 dark:text-gray-200";
  public fontText = "font-sans text-base text-gray-700 dark:text-gray-300";
  public fontSmall = "font-sans text-sm text-gray-500 dark:text-gray-400";

  activeFilterCount = computed(() => {
    const total = this.statusLegend().length;
    const active = this.visibleStatuses().size;
    return active > 0 && active < total ? active : 0;
  });

  statusLegend = computed(() => {
    return (Object.keys(StatusUtilsService.colorMap) as ServiceStatus[]).map(
      (status) => ({
        name: status,
        color: StatusUtilsService.getColor(status),
      })
    );
  });

  private readonly handleEventClick = (clickInfo: EventClickArg) => {
    runInInjectionContext(this.injector, () => {
      const request = this.dataService.getServiceRequestById(
        Number(clickInfo.event.id)
      );
      if (request) this.viewDetails.emit(request);
    });
  };

  private readonly handleEventDidMount = (info: {
    event: EventClickArg["event"];
    el: HTMLElement;
  }) => {
    runInInjectionContext(this.injector, () => {
      const request = this.dataService.getServiceRequestById(
        Number(info.event.id)
      );
      if (!request) return;

      const professionalName = this.getProfessionalName(
        request.professional_id
      );
      const startTime = this.formatTime(request.scheduled_start_datetime);

      const tooltipContent = `
        <div class="p-2 text-left font-sans text-sm">
          <div class="font-heading text-base font-bold mb-1">${
            request.title
          }</div>
          <div class="mb-1"><i class="fas fa-clock w-4 mr-1 text-gray-400"></i><strong class="font-semibold">${this.i18n.translate(
            "time"
          )}:</strong> <span class="font-sans">${startTime}</span></div>
          <div class="mb-1"><i class="fas fa-info-circle w-4 mr-1 text-gray-400"></i><strong class="font-semibold">${this.i18n.translate(
            "status"
          )}:</strong> <span class="font-sans">${this.getStatusTranslation(
        request.status
      )}</span></div>
          ${
            this.user().role === "professional"
              ? ""
              : `<div class="mb-1"><i class="fas fa-hard-hat w-4 mr-1 text-gray-400"></i><strong class="font-semibold">${this.i18n.translate(
                  "professional"
                )}:</strong> <span class="font-sans">${professionalName}</span></div>`
          }
        </div>
      `;

      tippy(info.el, {
        content: tooltipContent,
        allowHTML: true,
        theme: "light-border",
        placement: "top",
        animation: "shift-away",
      });
    });
  };

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
    },
    weekends: true,
    moreLinkClick: "popover",
    eventClick: this.handleEventClick,
    eventDidMount: this.handleEventDidMount,
    events: [],
    eventTimeFormat: {
      hour: "2-digit",
      minute: "2-digit",
      meridiem: false,
      hour12: false,
    },
    customButtons: {}, // Mantém para futuras customizações
    buttonText: {
      today: this.i18n.translate("today"),
      month: this.i18n.translate("month"),
      week: this.i18n.translate("week"),
      day: this.i18n.translate("day"),
      list: this.i18n.translate("agenda"),
    },
    themeSystem: "standard",
    // Removido: buttonClassNames (não suportado pelo CalendarOptions)
  };

  constructor() {
    this.selectAllStatuses();
    this.setupEffects();
  }

  ngAfterViewInit() {
    this.calendarApi.set(this.calendarComponent().getApi());
    this.setupResizeListener();
  }

  ngOnDestroy() {
    if (this.resizeHandler && globalThis.window !== undefined) {
      globalThis.window.removeEventListener("resize", this.resizeHandler);
    }
  }

  public toggleStatusFilter(status: ServiceStatus) {
    this.visibleStatuses.update((currentSet) => {
      const newSet = new Set(currentSet);
      if (newSet.has(status)) newSet.delete(status);
      else newSet.add(status);
      return newSet;
    });
  }

  public isStatusVisible(status: ServiceStatus): boolean {
    return this.visibleStatuses().has(status);
  }

  public selectAllStatuses() {
    this.visibleStatuses.set(new Set(this.statusLegend().map((s) => s.name)));
  }

  public toggleFilterVisibility() {
    this.isFilterVisible.update((v) => !v);
  }

  public clearAllFilters() {
    this.visibleStatuses.set(new Set());
  }

  private setupEffects() {
    effect(() => {
      const allRequests = this.dataService.serviceRequests();
      const currentUser = this.user();
      const visible = this.visibleStatuses();
      let userRequests: ServiceRequest[];

      if (currentUser.role === "professional") {
        userRequests = allRequests.filter(
          (r) => r.professional_id === currentUser.id
        );
      } else {
        userRequests = allRequests;
      }

      const pastEventStatuses = new Set<ServiceStatus>([
        "Finalizado",
        "Pago",
        "Cancelado",
        "Concluído - Aguardando aprovação",
      ]);

      const scheduledEvents = userRequests
        .filter((r) => r.scheduled_date || r.scheduled_start_datetime)
        .map((request) => {
          const isPastEvent = pastEventStatuses.has(request.status);

          if (!isPastEvent && !visible.has(request.status)) {
            return null;
          }

          return {
            id: String(request.id),
            title: `${request.title} (${this.getStatusTranslation(
              request.status
            )})`,
            start: request.scheduled_start_datetime || request.scheduled_date || '',
            backgroundColor: isPastEvent
              ? StatusUtilsService.getColor(request.status) + "80"
              : StatusUtilsService.getColor(request.status),
            borderColor: isPastEvent
              ? StatusUtilsService.getColor(request.status) + "80"
              : StatusUtilsService.getColor(request.status),
            textColor: isPastEvent ? "#e5e7eb" : "#ffffff",
            classNames: isPastEvent ? ["past-event"] : [],
          };
        })
        .filter((event): event is NonNullable<typeof event> => event !== null);

      const calendarApi = this.calendarApi();
      if (calendarApi) {
        calendarApi.setOption("events", scheduledEvents);
      }
    });

    effect(() => {
      this.i18n.language();
      const calendarApi = this.calendarApi();
      if (calendarApi) {
        this.updateCalendarLocale(calendarApi);
      }
    });
  }

  private setupResizeListener() {
    if (globalThis.window !== undefined) {
      this.resizeHandler = () => this.updateCalendarForResize();
      globalThis.window.addEventListener("resize", this.resizeHandler);
      this.updateCalendarForResize();
    }
  }

  private updateCalendarForResize() {
    const calendarApi = this.calendarApi();
    if (!calendarApi) return;

    const isMobile = globalThis.window.innerWidth < 768;
    calendarApi.setOption("aspectRatio", isMobile ? 1 : 1.35);
    calendarApi.setOption("height", isMobile ? 500 : "100%");
    calendarApi.setOption("contentHeight", isMobile ? 400 : "auto");
    calendarApi.setOption("dayMaxEvents", isMobile ? 2 : 5);
    calendarApi.setOption("eventDisplay", isMobile ? "block" : "auto");
  }

  private updateCalendarLocale(calendarApi: CalendarApi) {
    const newLocale = this.i18n.language() === "pt" ? ptBr : "en";
    calendarApi.setOption("locale", newLocale);
    calendarApi.setOption("buttonText", {
      today: this.i18n.translate("today"),
      month: this.i18n.translate("month"),
      week: this.i18n.translate("week"),
      day: this.i18n.translate("day"),
      list: this.i18n.translate("agenda"),
    });
  }

  private getClientName(clientId: number | null): string {
    if (!clientId) return this.i18n.translate("unknownClient");
    return (
      this.dataService.users().find((u) => u.id === clientId)?.name ||
      this.i18n.translate("unknownClient")
    );
  }

  private getProfessionalName(professionalId: number | null): string {
    if (!professionalId) return this.i18n.translate("unassigned");
    return (
      this.dataService.users().find((u) => u.id === professionalId)?.name ||
      this.i18n.translate("unassigned")
    );
  }

  private formatTime(isoDate: string | null | undefined): string {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    return date.toLocaleTimeString(
      this.i18n.language() === "pt" ? "pt-PT" : "en-US",
      { hour: "2-digit", minute: "2-digit" }
    );
  }

  public getStatusTranslation(status: ServiceStatus): string {
    return StatusUtilsService.getLabel(status, this.i18n);
  }
}
