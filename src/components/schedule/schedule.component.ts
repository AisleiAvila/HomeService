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
} from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { I18nPipe } from "../../pipes/i18n.pipe";
import {
  FullCalendarModule,
  FullCalendarComponent,
} from "@fullcalendar/angular";
import { CalendarOptions, EventClickArg, CalendarApi } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from '@fullcalendar/list';
import ptBr from "@fullcalendar/core/locales/pt-br";
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { I18nService } from "@/src/i18n.service";

@Component({
  selector: "app-schedule",
  standalone: true,
  imports: [CommonModule, FullCalendarModule, I18nPipe],
  templateUrl: "./schedule.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "block h-full",
  },
})
export class ScheduleComponent implements OnDestroy, AfterViewInit {
  user = input.required<User>();
  viewDetails = output<ServiceRequest>();

  private dataService = inject(DataService);
  i18n = inject(I18nService);
  private injector = inject(Injector);
  private resizeHandler?: () => void;

  calendarComponent = viewChild.required<FullCalendarComponent>("calendar");
  private calendarApi = signal<CalendarApi | undefined>(undefined);

  visibleStatuses = signal<Set<ServiceStatus>>(new Set());
  isFilterVisible = signal(false);

  private statusColorMap: Record<ServiceStatus, string> = {
    Solicitado: "#eab308",
    "Em análise": "#06b6d4",
    "Aguardando esclarecimentos": "#f59e0b",
    "Orçamento enviado": "#0ea5e9",
    "Aguardando aprovação do orçamento": "#6366f1",
    "Orçamento aprovado": "#22c55e",
    "Orçamento rejeitado": "#ef4444",
    "Aguardando data de execução": "#fbbf24",
    "Data proposta pelo administrador": "#3b82f6",
    "Aguardando aprovação da data": "#6366f1",
    "Data aprovada pelo cliente": "#22c55e",
    "Data rejeitada pelo cliente": "#ef4444",
    "Buscando profissional": "#a855f7",
    "Profissional selecionado": "#14b8a6",
    "Aguardando confirmação do profissional": "#f97316",
    Agendado: "#3b82f6",
    "Em execução": "#8b5cf6",
    "Concluído - Aguardando aprovação": "#84cc16",
    "Aprovado pelo cliente": "#22c55e",
    "Rejeitado pelo cliente": "#ef4444",
    Pago: "#10b981",
    Finalizado: "#059669",
    Cancelado: "#6b7280",
  };

  activeFilterCount = computed(() => {
    const total = this.statusLegend().length;
    const active = this.visibleStatuses().size;
    return active > 0 && active < total ? active : 0;
  });

  statusLegend = computed(() => {
    return (Object.keys(this.statusColorMap) as ServiceStatus[]).map(status => ({
      name: status,
      color: this.statusColorMap[status]
    }));
  });

  private handleEventClick = (clickInfo: EventClickArg) => {
    runInInjectionContext(this.injector, () => {
      const request = this.dataService.getServiceRequestById(Number(clickInfo.event.id));
      if (request) this.viewDetails.emit(request);
    });
  };

  private handleEventDidMount = (info: { event: EventClickArg['event'], el: HTMLElement }) => {
    runInInjectionContext(this.injector, () => {
      const request = this.dataService.getServiceRequestById(Number(info.event.id));
      if (!request) return;

      const professionalName = this.getProfessionalName(request.professional_id);
      const clientName = this.getClientName(request.client_id);
      const startTime = this.formatTime(request.scheduled_start_datetime);

      const tooltipContent = `
        <div class="p-2 text-sm text-left">
          <div class="font-bold mb-1">${request.title}</div>
          <div class="mb-1"><i class="fas fa-clock w-4 mr-1 text-gray-400"></i><strong>${this.i18n.translate('time')}:</strong> ${startTime}</div>
          <div class="mb-1"><i class="fas fa-info-circle w-4 mr-1 text-gray-400"></i><strong>${this.i18n.translate('status')}:</strong> ${this.getStatusTranslation(request.status)}</div>
          ${this.user().role !== 'client' ? `<div class="mb-1"><i class="fas fa-user w-4 mr-1 text-gray-400"></i><strong>${this.i18n.translate('client')}:</strong> ${clientName}</div>` : ''}
          ${this.user().role !== 'professional' ? `<div class="mb-1"><i class="fas fa-hard-hat w-4 mr-1 text-gray-400"></i><strong>${this.i18n.translate('professional')}:</strong> ${professionalName}</div>` : ''}
        </div>
      `;

      tippy(info.el, {
        content: tooltipContent,
        allowHTML: true,
        theme: 'light-border',
        placement: 'top',
        animation: 'shift-away',
      });
    });
  };

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: "dayGridMonth",
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
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
    if (this.resizeHandler && typeof window !== "undefined") {
      window.removeEventListener("resize", this.resizeHandler);
    }
  }

  public toggleStatusFilter(status: ServiceStatus) {
    this.visibleStatuses.update(currentSet => {
      const newSet = new Set(currentSet);
      if (newSet.has(status)) newSet.delete(status); else newSet.add(status);
      return newSet;
    });
  }

  public isStatusVisible(status: ServiceStatus): boolean {
    return this.visibleStatuses().has(status);
  }

  public selectAllStatuses() {
    this.visibleStatuses.set(new Set(this.statusLegend().map(s => s.name)));
  }

  public toggleFilterVisibility() {
    this.isFilterVisible.update(v => !v);
  }

  public deselectAllStatuses() {
    this.visibleStatuses.set(new Set());
  }

  private setupEffects() {
    effect(() => {
      const allRequests = this.dataService.serviceRequests();
      const currentUser = this.user();
      const visible = this.visibleStatuses();
      let userRequests: ServiceRequest[];

      if (currentUser.role === "client") {
        userRequests = allRequests.filter(r => r.client_id === currentUser.id);
      } else if (currentUser.role === "professional") {
        userRequests = allRequests.filter(r => r.professional_id === currentUser.id);
      } else {
        userRequests = allRequests;
      }

      const pastEventStatuses: ServiceStatus[] = ["Finalizado", "Pago", "Cancelado", "Concluído - Aguardando aprovação"];

      const scheduledEvents = userRequests
        .filter(r => r.scheduled_date || r.scheduled_start_datetime)
        .map(request => {
          const isPastEvent = pastEventStatuses.includes(request.status);
          
          if (!isPastEvent && !visible.has(request.status)) {
            return null;
          }

          return {
            id: String(request.id),
            title: `${request.title} (${this.getStatusTranslation(request.status)})`,
            start: request.scheduled_start_datetime || request.scheduled_date!,
            backgroundColor: isPastEvent ? this.statusColor(request.status) + '80' : this.statusColor(request.status),
            borderColor: isPastEvent ? this.statusColor(request.status) + '80' : this.statusColor(request.status),
            textColor: isPastEvent ? '#e5e7eb' : '#ffffff',
            classNames: isPastEvent ? ['past-event'] : [],
          };
        })
        .filter((event): event is NonNullable<typeof event> => event !== null);

      const calendarApi = this.calendarApi();
      if (calendarApi) {
        calendarApi.setOption('events', scheduledEvents);
      }
    });

    effect(() => {
      const language = this.i18n.language();
      const calendarApi = this.calendarApi();
      if (calendarApi) {
        this.updateCalendarLocale(calendarApi);
      }
    });
  }

  private setupResizeListener() {
    if (typeof window !== "undefined") {
      this.resizeHandler = () => this.updateCalendarForResize();
      window.addEventListener("resize", this.resizeHandler);
      this.updateCalendarForResize();
    }
  }

  private updateCalendarForResize() {
    const calendarApi = this.calendarApi();
    if (!calendarApi) return;

    const isMobile = window.innerWidth < 768;
    calendarApi.setOption('aspectRatio', isMobile ? 1.0 : 1.35);
    calendarApi.setOption('height', isMobile ? 500 : "100%");
    calendarApi.setOption('contentHeight', isMobile ? 400 : "auto");
    calendarApi.setOption('dayMaxEvents', isMobile ? 2 : 5);
    calendarApi.setOption('eventDisplay', isMobile ? "block" : "auto");
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

  private getClientName(clientId: number): string {
    return this.dataService.users().find(u => u.id === clientId)?.name || this.i18n.translate('unknownClient');
  }

  private getProfessionalName(professionalId: number | null): string {
    if (!professionalId) return this.i18n.translate('unassigned');
    return this.dataService.users().find(u => u.id === professionalId)?.name || this.i18n.translate('unassigned');
  }

  private formatTime(isoDate: string | null | undefined): string {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleTimeString(this.i18n.language() === 'pt' ? 'pt-PT' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  }

  private statusColor(status: ServiceStatus): string {
    return this.statusColorMap[status] || "#6b7280";
  }

  public getStatusTranslation(status: ServiceStatus): string {
    const statusMap: Record<ServiceStatus, string> = {
      Solicitado: "statusPending",
      "Em análise": "statusAnalyzing",
      "Aguardando esclarecimentos": "statusAwaitingClarification",
      "Orçamento enviado": "statusQuoted",
      "Aguardando aprovação do orçamento": "statusAwaitingQuoteApproval",
      "Orçamento aprovado": "statusApproved",
      "Orçamento rejeitado": "statusQuoteRejected",
      "Aguardando data de execução": "statusAwaitingExecutionDate",
      "Data proposta pelo administrador": "statusDateProposedByAdmin",
      "Aguardando aprovação da data": "statusAwaitingDateApproval",
      "Data aprovada pelo cliente": "statusDateApprovedByClient",
      "Data rejeitada pelo cliente": "statusDateRejectedByClient",
      "Buscando profissional": "statusSearchingProfessional",
      "Profissional selecionado": "statusProfessionalSelected",
      "Aguardando confirmação do profissional": "statusAwaitingProfessionalConfirmation",
      Agendado: "statusScheduled",
      "Em execução": "statusInProgress",
      "Concluído - Aguardando aprovação": "statusCompletedAwaitingApproval",
      "Aprovado pelo cliente": "statusApprovedByClient",
      "Rejeitado pelo cliente": "statusRejectedByClient",
      Pago: "statusPaid",
      Finalizado: "statusCompleted",
      Cancelado: "statusCancelled",
    };
    return this.i18n.translate(statusMap[status] || "statusPending");
  }
}
