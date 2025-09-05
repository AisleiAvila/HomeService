


import { Component, ChangeDetectionStrategy, input, output, inject, effect, viewChild, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, ServiceRequest, ServiceStatus } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';
import { I18nService } from '../../services/i18n.service';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBr from '@fullcalendar/core/locales/pt-br';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './schedule.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full'
  }
})
export class ScheduleComponent {
  user = input.required<User>();
  viewDetails = output<ServiceRequest>();

  private dataService = inject(DataService);
  private i18n = inject(I18nService);
  private injector = inject(Injector); // Inject the injector to provide context

  calendarComponent = viewChild.required<FullCalendarComponent>('calendar');

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
  }

  // Static options for stable initialization, now including the event click handler.
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek'
    },
    weekends: true,
    height: '100%',
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      meridiem: false,
      hour12: false
    },
    // The stable, context-aware event handler is now part of the initial config.
    eventClick: this.handleEventClick 
  };
  
  private statusColor(status: ServiceStatus): string {
    const colorMap: Record<ServiceStatus, string> = {
      'Pending': '#eab308',     // yellow-500
      'Quoted': '#06b6d4',      // cyan-500
      'Approved': '#6366f1',    // indigo-500
      'Scheduled': '#14b8a6',   // teal-500
      'Assigned': '#3b82f6',    // blue-500
      'In Progress': '#8b5cf6', // purple-500
      'Completed': '#22c55e',   // green-500
      'Cancelled': '#6b7280',   // gray-500
    };
    return colorMap[status] || '#6b7280';
  }

  constructor() {
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
      if (currentUser.role === 'client') {
        userRequests = allRequests.filter(r => r.client_id === currentUser.id);
      } else if (currentUser.role === 'professional') {
        userRequests = allRequests.filter(r => r.professional_id === currentUser.id);
      } else {
        userRequests = allRequests;
      }
      
      const scheduledEvents = userRequests
        .filter(r => r.scheduled_date)
        .map(request => ({
          id: String(request.id),
          title: request.title,
          start: request.scheduled_date!,
          backgroundColor: this.statusColor(request.status),
          borderColor: this.statusColor(request.status),
          textColor: '#ffffff'
        }));

      const newLocale = this.i18n.language() === 'pt' ? ptBr : 'en';
      
      // Update calendar imperatively after it has been initialized
      calendarApi.setOption('locale', newLocale);
      calendarApi.getEventSources().forEach(source => source.remove());
      calendarApi.addEventSource(scheduledEvents);
    });
  }
}