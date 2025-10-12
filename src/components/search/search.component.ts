import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  input,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { DataService } from "../../services/data.service";
import { User } from "../../models/maintenance.models";
import { ServiceListComponent } from "../service-list/service-list.component";
import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-search",
  standalone: true,
  imports: [CommonModule, FormsModule, ServiceListComponent, I18nPipe],
  templateUrl: "./search.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  user = input.required<User>();
  private dataService = inject(DataService);

  allRequests = this.dataService.serviceRequests;
  categories = this.dataService.categories;
  statuses = ["Pending", "Assigned", "In Progress", "Completed", "Cancelled"];

  searchTerm = signal("");
  categoryFilter = signal<number | null>(null);
  statusFilter = signal("");

  filteredRequests = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const categoryId = this.categoryFilter();
    const status = this.statusFilter();
    return this.allRequests().filter((request) => {
      const termMatch = term
        ? request.title.toLowerCase().includes(term) ||
          request.description.toLowerCase().includes(term)
        : true;
      const categoryMatch =
        categoryId !== null ? request.category_id === categoryId : true;
      const statusMatch = status ? request.status === status : true;
      return termMatch && categoryMatch && statusMatch;
    });
  });
}
