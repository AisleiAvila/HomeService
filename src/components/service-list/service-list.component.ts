import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ServiceRequest, User, Address } from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { I18nService } from "../../services/i18n.service";

@Component({
  selector: "app-service-list",
  standalone: true,
  imports: [CommonModule, I18nPipe],
  templateUrl: "./service-list.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceListComponent {
  serviceRequests = input.required<ServiceRequest[]>();
  currentUser = input.required<User>();

  viewDetails = output<ServiceRequest>();
  openChat = output<ServiceRequest>();
  approveQuote = output<ServiceRequest>();
  rejectQuote = output<ServiceRequest>();
  payNow = output<ServiceRequest>();
  scheduleRequest = output<ServiceRequest>();

  private dataService = inject(DataService);
  private i18n = inject(I18nService);

  formatAddress(address: Address): string {
    return address.street + ", " + address.city;
  }

  statusClass(status: string): string {
    const baseClass =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    const colorClasses: { [key: string]: string } = {
      Pending: "bg-yellow-100 text-yellow-800",
      Quoted: "bg-cyan-100 text-cyan-800",
      Approved: "bg-indigo-100 text-indigo-800",
      Scheduled: "bg-teal-100 text-teal-800",
      Assigned: "bg-blue-100 text-blue-800",
      "In Progress": "bg-purple-100 text-purple-800",
      Completed: "bg-green-100 text-green-800",
      Cancelled: "bg-gray-100 text-gray-800",
    };
    return (
      baseClass + " " + (colorClasses[status] || "bg-gray-100 text-gray-800")
    );
  }
}
