import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ServiceCategory, User } from "../../../models/maintenance.models";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { DataService } from "../../../services/data.service";
import { I18nService } from "../../../i18n.service";
import { NotificationService } from "../../../services/notification.service";
import { SupabaseService } from "../../../services/supabase.service";

@Component({
    selector: "app-professional-edit-page",
    standalone: true,
    imports: [CommonModule, FormsModule, I18nPipe],
    templateUrl: "./professional-edit-page.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalEditPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);
    private readonly notificationService = inject(NotificationService);
    private readonly supabase = inject(SupabaseService);

    professional = signal<User | null>(null);
    name = signal("");
    email = signal("");
    phone = signal("");
    isNatanEmployee = signal(false);
    specialties = signal<ServiceCategory[]>([]);
    loading = signal(true);
    
    // Computed signal para categorias
    categories = computed(() => this.dataService.categories());

    ngOnInit(): void {
        this.loadProfessionalData();
    }

    private async loadProfessionalData(): Promise<void> {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.router.navigate(['/admin/professionals']);
            return;
        }

        // Garantir que os dados estão carregados
        await this.dataService.loadInitialData();
        
        console.log('Categorias carregadas:', this.dataService.categories());

        // Carregar dados do profissional
        const professionalData = this.dataService.users().find(u => u.id === Number.parseInt(id));
        if (professionalData) {
            this.professional.set(professionalData);
            this.name.set(professionalData.name);
            this.email.set(professionalData.email);
            this.phone.set(professionalData.phone || "");
            this.isNatanEmployee.set(professionalData.is_natan_employee ?? false);
            this.specialties.set(professionalData.specialties || []);
            console.log('Especialidades do profissional:', professionalData.specialties);
            this.loading.set(false);
        } else {
            this.notificationService.addNotification("Profissional não encontrado");
            this.router.navigate(['/admin/professionals']);
        }
    }

    isSpecialtySelected(category: ServiceCategory): boolean {
        return this.specialties().some((c) => c.id === category.id);
    }

    onSpecialtyToggle(category: ServiceCategory, event: Event) {
        const isChecked = (event.target as HTMLInputElement).checked;
        const current = this.specialties();
        
        if (isChecked) {
            if (!current.some(c => c.id === category.id)) {
                this.specialties.set([...current, category]);
            }
        } else {
            this.specialties.set(current.filter(c => c.id !== category.id));
        }
    }

    async save() {
        const professional = this.professional();
        if (!professional) return;

        const name = this.name();
        const email = this.email();
        const phone = this.phone();

        if (!name || !email || !phone) {
            this.notificationService.addNotification(
                this.i18n.translate("fillRequiredFields")
            );
            return;
        }

        if (this.specialties().length === 0) {
            this.notificationService.addNotification(
                "Por favor, selecione pelo menos uma especialidade"
            );
            return;
        }

        try {
            // Atualizar dados básicos
            const { error: updateError } = await this.supabase.client
                .from("users")
                .update({
                    name,
                    email,
                    phone,
                    is_natan_employee: this.isNatanEmployee()
                })
                .eq("id", professional.id);

            if (updateError) throw updateError;

            // Atualizar especialidades
            const { error: deleteError } = await this.supabase.client
                .from("user_specialties")
                .delete()
                .eq("user_id", professional.id);

            if (deleteError) throw deleteError;

            const specialtiesToInsert = this.specialties().map(cat => ({
                user_id: professional.id,
                category_id: cat.id
            }));

            if (specialtiesToInsert.length > 0) {
                const { error: insertError } = await this.supabase.client
                    .from("user_specialties")
                    .insert(specialtiesToInsert);

                if (insertError) throw insertError;
            }

            this.notificationService.addNotification(
                this.i18n.translate("professionalUpdated", { name })
            );
            
            await this.dataService.fetchUsers();
            this.router.navigate(['/admin/professionals']);
        } catch (error) {
            console.error("Error updating professional:", error);
            this.notificationService.addNotification(
                this.i18n.translate("errorUpdatingClient")
            );
        }
    }

    cancel() {
        this.router.navigate(['/admin/professionals']);
    }
}
