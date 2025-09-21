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
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  User,
  ServiceRequest,
  ServiceStatus,
} from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { I18nService } from "../../services/i18n.service";
import { I18nPipe } from "../../pipes/i18n.pipe";
import {
  FullCalendarModule,
  FullCalendarComponent,
} from "@fullcalendar/angular";
import { CalendarOptions, EventClickArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBr from "@fullcalendar/core/locales/pt-br";

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
export class ScheduleComponent implements OnDestroy {
  user = input.required<User>();
  viewDetails = output<ServiceRequest>();

  private dataService = inject(DataService);
  private i18n = inject(I18nService);
  private injector = inject(Injector); // Inject the injector to provide context
  private resizeHandler?: () => void;

  calendarComponent = viewChild.required<FullCalendarComponent>("calendar");

  private isMobile(): boolean {
    return window.innerWidth < 768;
  }

  private getResponsiveCalendarOptions(): Partial<CalendarOptions> {
    const isMobile = this.isMobile();

    return {
      aspectRatio: isMobile ? 1.0 : 1.35,
      contentHeight: isMobile ? 400 : "auto",
      height: isMobile ? 500 : "100%",
      headerToolbar: isMobile
        ? {
            left: "prev,next",
            center: "title",
            right: "today",
          }
        : {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek",
          },
      eventDisplay: isMobile ? "block" : "auto",
      dayMaxEvents: isMobile ? 2 : 5,
      initialView: isMobile ? "dayGridMonth" : "dayGridMonth",
      dayHeaderFormat: isMobile ? { weekday: "short" } : { weekday: "long" },
    };
  }

  // A stable arrow function that uses `runInInjectionContext` to safely access DI.
  // This is the robust way to handle callbacks from third-party libraries in zoneless Angular.
  private handleEventClick = (clickInfo: EventClickArg) => {
    runInInjectionContext(this.injector, () => {
      const dataService = inject(DataService);
      const requestId = Number(clickInfo.event.id);
      const request = dataService.getServiceRequestById(requestId);
      if (request) {
        this.viewDetails.emit(request);
      }
    });
  };

  // Static options for stable initialization, now including the event click handler.
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: "dayGridMonth",
    // Mobile-responsive header toolbar
    headerToolbar:
      window.innerWidth < 768
        ? {
            left: "prev,next",
            center: "title",
            right: "today",
          }
        : {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek",
          },
    // Mobile-specific responsive settings
    aspectRatio: window.innerWidth < 768 ? 1.0 : 1.35,
    contentHeight: window.innerWidth < 768 ? 400 : "auto",
    weekends: true,
    height: window.innerWidth < 768 ? 500 : "100%",
    eventTimeFormat: {
      hour: "2-digit",
      minute: "2-digit",
      meridiem: false,
      hour12: false,
    },
    // Event display settings for mobile
    eventDisplay: window.innerWidth < 768 ? "block" : "auto",
    dayMaxEvents: window.innerWidth < 768 ? 2 : 5,
    moreLinkClick: "popover",
    // The stable, context-aware event handler is now part of the initial config.
    eventClick: this.handleEventClick,
  };

  private statusColor(status: ServiceStatus): string {
    const colorMap: Record<ServiceStatus, string> = {
      Solicitado: "#eab308", // yellow-500
      "Em análise": "#06b6d4", // cyan-500
      "Aguardando esclarecimentos": "#f59e0b", // amber-500
      "Orçamento enviado": "#0ea5e9", // sky-500
      "Aguardando aprovação do orçamento": "#6366f1", // indigo-500
      "Orçamento aprovado": "#22c55e", // green-500
      "Orçamento rejeitado": "#ef4444", // red-500
      "Aguardando data de execução": "#fbbf24", // amber-400
      "Data proposta pelo administrador": "#3b82f6", // blue-500
      "Aguardando aprovação da data": "#6366f1", // indigo-500
      "Data aprovada pelo cliente": "#22c55e", // green-500
      "Data rejeitada pelo cliente": "#ef4444", // red-500
      "Buscando profissional": "#a855f7", // purple-500
      "Profissional selecionado": "#14b8a6", // teal-500
      "Aguardando confirmação do profissional": "#f97316", // orange-500
      Agendado: "#3b82f6", // blue-500
      "Em execução": "#8b5cf6", // purple-500
      "Concluído - Aguardando aprovação": "#84cc16", // lime-500
      "Aprovado pelo cliente": "#22c55e", // green-500
      "Rejeitado pelo cliente": "#ef4444", // red-500
      Pago: "#10b981", // emerald-500
      Finalizado: "#059669", // emerald-600
      Cancelado: "#6b7280", // gray-500
    };
    return colorMap[status] || "#6b7280";
  }

  private getStatusTranslation(status: ServiceStatus): string {
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
      "Aguardando confirmação do profissional":
        "statusAwaitingProfessionalConfirmation",
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

  constructor() {
    // Window resize handler for responsive calendar
    if (typeof window !== "undefined") {
      this.resizeHandler = () => this.updateCalendarForResize();
      window.addEventListener("resize", this.resizeHandler);
    }

    // This effect now only handles dynamic data updates (events and locale).
    effect(() => {
      const calendarApi = this.calendarComponent()?.getApi();
      if (!calendarApi) {
        return;
      }

      // Get new dynamic data from signals
      const allRequests = this.dataService.serviceRequests();
      const currentUser = this.user();

      let userRequests: ServiceRequest[];
      if (currentUser.role === "client") {
        userRequests = allRequests.filter(
          (r) => r.client_id === currentUser.id
        );
      } else if (currentUser.role === "professional") {
        userRequests = allRequests.filter(
          (r) => r.professional_id === currentUser.id
        );
      } else {
        userRequests = allRequests;
      }

      const scheduledEvents = userRequests
        .filter((r) => r.scheduled_date || r.scheduled_start_datetime)
        .map((request) => ({
          id: String(request.id),
          title: `${request.title} (${this.getStatusTranslation(
            request.status
          )})`,
          start: request.scheduled_start_datetime || request.scheduled_date!,
          backgroundColor: this.statusColor(request.status),
          borderColor: this.statusColor(request.status),
          textColor: "#ffffff",
        }));

      const newLocale = this.i18n.language() === "pt" ? ptBr : "en";

      console.log("Setting locale to:", newLocale);

      // Update calendar imperatively after it has been initialized
      calendarApi.setOption("locale", newLocale);

      // Update button texts based on current language
      calendarApi.setOption("buttonText", {
        today: this.i18n.translate("today"),
        month: this.i18n.translate("month"),
        week: this.i18n.translate("week"),
        day: this.i18n.translate("day"),
        list: this.i18n.translate("agenda"),
      });

      // Force calendar to re-render to apply locale changes
      calendarApi.render();

      calendarApi.getEventSources().forEach((source) => source.remove());
      calendarApi.addEventSource(scheduledEvents);
    });
  }

  ngOnDestroy() {
    if (this.resizeHandler && typeof window !== "undefined") {
      window.removeEventListener("resize", this.resizeHandler);
    }
  }

  private updateCalendarForResize() {
    const calendarApi = this.calendarComponent()?.getApi();
    if (!calendarApi) return;

    const isMobile = this.isMobile();

    // Update responsive settings on window resize
    calendarApi.setOption("aspectRatio", isMobile ? 1.0 : 1.35);
    calendarApi.setOption("height", isMobile ? 500 : "100%");
    calendarApi.setOption("contentHeight", isMobile ? 400 : "auto");
    calendarApi.setOption("dayMaxEvents", isMobile ? 2 : 5);
    calendarApi.setOption("eventDisplay", isMobile ? "block" : "auto");

    // Update header toolbar for mobile
    calendarApi.setOption(
      "headerToolbar",
      isMobile
        ? {
            left: "prev,next",
            center: "title",
            right: "today",
          }
        : {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek",
          }
    );

    calendarApi.render();
  }
}
