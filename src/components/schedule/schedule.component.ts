import { Component, ChangeDetectionStrategy, input, computed, output, inject, viewChild, ElementRef, afterNextRender, effect, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, ServiceRequest, ServiceStatus, ServiceCategory } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';
import { I18nService } from '../../services/i18n.service';

import { Calendar, EventInput, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'h-full flex flex-col bg-white p-4 sm:p-6 rounded-lg shadow-md fade-in'
  }
})
export class ScheduleComponent implements OnDestroy {
  user = input.required<User>();
  viewDetails = output<ServiceRequest>();
  private dataService = inject(DataService);
  private i18n = inject(I18nService);

  calendarEl = viewChild.required<ElementRef<HTMLDivElement>>('calendarEl');
  private calendar = signal<Calendar | null>(null);

  private readonly serviceStatusColors: Record<ServiceStatus, string> = {
    'Pending': '#f59e0b', // amber-500
    'Quoted': '#06b6d4', // cyan-500
    'Approved': '#6366f1', // indigo-500
    'Assigned': '#3b82f6', // blue-500
    'In Progress': '#8b5cf6', // violet-500
    'Completed': '#22c55e', // green-500
    'Cancelled': '#64748b'  // slate-500
  };
  
  private userServices = computed(() => {
    const allServices = this.dataService.serviceRequests();
    const currentUser = this.user();
    if (currentUser.role === 'admin') {
      return allServices.filter(s => s.scheduledDate);
    } else if (currentUser.role === 'client') {
      return allServices.filter(s => s.clientId === currentUser.id && s.scheduledDate);
    } else if (currentUser.role === 'professional') {
      return allServices.filter(s => s.professionalId === currentUser.id && s.scheduledDate);
    }
    return [];
  });

  private calendarEvents = computed<EventInput[]>(() => {
    return this.userServices().map((service: ServiceRequest) => ({
      title: service.title,
      date: this.formatDate(service.scheduledDate!),
      backgroundColor: this.serviceStatusColors[service.status],
      borderColor: this.serviceStatusColors[service.status],
      extendedProps: {
        id: service.id,
        category: service.category
      }
    }));
  });

  constructor() {
    afterNextRender(() => {
      const initialLang = this.i18n.language();
      const calendar = new Calendar(this.calendarEl().nativeElement, {
        plugins: [dayGridPlugin],
        initialView: 'dayGridMonth',
        locale: initialLang === 'pt' ? ptBrLocale : 'en',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek,dayGridDay'
        },
        weekends: true,
        height: '100%',
        events: this.calendarEvents(),
        eventContent: (arg) => {
          const category = arg.event.extendedProps.category;
          const iconHtml = `<i class="${this.getIconForCategory(category)} fa-fw mr-2 text-xs"></i>`;
          return {
            html: `<div class="flex items-center overflow-hidden whitespace-nowrap">${iconHtml}<span class="font-semibold">${arg.event.title}</span></div>`
          };
        },
        eventClick: (clickInfo: EventClickArg) => {
          const serviceId = parseInt(clickInfo.event.extendedProps.id, 10);
          const service = this.dataService.getServiceRequestById(serviceId);
          if (service) {
            this.viewDetails.emit(service);
          }
        }
      });
      calendar.render();
      this.calendar.set(calendar);
      
      // Fix for rendering issue where grid doesn't appear initially
      setTimeout(() => calendar.updateSize(), 0);
    });

    // Effect to reactively update events when the source data changes
    effect(() => {
      const cal = this.calendar();
      const events = this.calendarEvents();
      if (cal) {
        cal.getEventSources().forEach(source => source.remove());
        cal.addEventSource(events);
      }
    });

    // Effect to update calendar locale when language changes
    effect(() => {
        const cal = this.calendar();
        const lang = this.i18n.language();
        if (cal) {
            cal.setOption('locale', lang === 'pt' ? ptBrLocale : 'en');
        }
    });
  }

  ngOnDestroy() {
    this.calendar()?.destroy();
  }
  
  private getIconForCategory(category: ServiceCategory): string {
    const iconMap: Record<string, string> = {
      'Plumbing': 'fas fa-wrench',
      'Electrical': 'fas fa-bolt',
      'Painting': 'fas fa-paint-roller',
      'Gardening': 'fas fa-leaf',
      'General Repair': 'fas fa-hammer'
    };
    return iconMap[category] || 'fas fa-toolbox';
  }
  
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  }
}