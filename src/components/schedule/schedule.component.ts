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
  imports: [CommonModule, FullCalendarModule],
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
      Pending: "#eab308", // yellow-500
      Quoted: "#06b6d4", // cyan-500
      Approved: "#6366f1", // indigo-500
      Scheduled: "#14b8a6", // teal-500
      Assigned: "#3b82f6", // blue-500
      "In Progress": "#8b5cf6", // purple-500
      Completed: "#22c55e", // green-500
      Cancelled: "#6b7280", // gray-500
    };
    return colorMap[status] || "#6b7280";
  }

  private getStatusTranslation(status: ServiceStatus): string {
    const statusMap: Record<ServiceStatus, string> = {
      Pending: "statusPending",
      Quoted: "statusQuoted",
      Approved: "statusApproved",
      Scheduled: "statusScheduled",
      Assigned: "statusAssigned",
      "In Progress": "statusInProgress",
      Completed: "statusCompleted",
      Cancelled: "statusCancelled",
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
        .filter((r) => r.scheduled_date)
        .map((request) => ({
          id: String(request.id),
          title: `${request.title} (${this.getStatusTranslation(
            request.status
          )})`,
          start: request.scheduled_date!,
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
