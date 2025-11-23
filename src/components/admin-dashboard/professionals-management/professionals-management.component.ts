import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ServiceCategory, User } from "../../../models/maintenance.models";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { DataService } from "../../../services/data.service";
import { I18nService } from "../../../i18n.service";
import { ProfessionalFormComponent } from "./professional-form.component";
import { ProfessionalEditFormComponent } from "./professional-edit-form.component";

@Component({
    selector: "app-professionals-management",
    standalone: true,
    imports: [CommonModule, FormsModule, I18nPipe, ProfessionalFormComponent, ProfessionalEditFormComponent],
    templateUrl: "./professionals-management.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalsManagementComponent {
            // Paginação
            pageSize = 10;
            currentPage = signal(1);

            paginatedProfessionals = computed(() => {
                const all = this.professionals();
                const start = (this.currentPage() - 1) * this.pageSize;
                return all.slice(start, start + this.pageSize);
            });

            totalPages = computed(() => {
                return Math.ceil(this.professionals().length / this.pageSize) || 1;
            });

            nextPage() {
                if (this.currentPage() < this.totalPages()) {
                    this.currentPage.set(this.currentPage() + 1);
                }
            }

            prevPage() {
                if (this.currentPage() > 1) {
                    this.currentPage.set(this.currentPage() - 1);
                }
            }
        // trackBy para profissionais
        trackByProfessional(index: number, pro: User) {
            return pro.id;
        }

        // trackBy para especialidades
        trackBySpecialty(index: number, specialty: string) {
            return specialty;
        }
    private readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);

    // Feedback visual para toast/modal
    feedbackMessage = signal<string | null>(null);
    feedbackType = signal<'success' | 'error' | 'info'>('info');

    showFeedback(message: string, type: 'success' | 'error' | 'info' = 'info') {
        this.feedbackMessage.set(message);
        this.feedbackType.set(type);
        setTimeout(() => this.feedbackMessage.set(null), 3500); // Toast desaparece após 3,5s
    }


    isLoadingProfessionals = signal(false);
    professionals = computed(() => {
        return this.dataService.users().filter(
            (u) => u.role === "professional" && u.status === "Active"
        );
    });

    allCategories = this.dataService.categories();

    // Add Professional Form
    showAddProfessionalForm = signal(false);
    newProfessionalName = signal("");
    newProfessionalEmail = signal("");

    newProfessionalSpecialties = signal<ServiceCategory[]>([]);

    // Signals para erros do formulário de adição
    newProfessionalNameError = signal<string | null>(null);
    newProfessionalEmailError = signal<string | null>(null);
    newProfessionalSpecialtiesError = signal<string | null>(null);

    // Edit Professional
    editingProfessional = signal<User | null>(null);
    editingProfessionalName = signal("");
    editingProfessionalEmail = signal("");
    editingProfessionalSpecialties = signal<ServiceCategory[]>([]);

    toggleAddProfessionalForm() {
        // Só exibe o formulário de adição se não estiver editando
        if (!this.editingProfessional()) {
            this.showAddProfessionalForm.set(true);
        }
    }

    resetNewProfessionalForm() {
        this.newProfessionalName.set("");
        this.newProfessionalEmail.set("");
        this.newProfessionalSpecialties.set([]);
        this.showAddProfessionalForm.set(false);
        this.editingProfessional.set(null);
        this.showFeedback('Formulário limpo', 'info');
    }

    toggleNewProfessionalSpecialty(category: ServiceCategory, event: any) {
        const checked = event.target.checked;
        if (checked) {
            this.newProfessionalSpecialties.update((s) => [...s, category]);
        } else {
            this.newProfessionalSpecialties.update((s) =>
                s.filter((c) => c.id !== category.id)
            );
        }
    }

    addProfessional() {
        // Implement add professional logic
        console.log("Add professional:", {
            name: this.newProfessionalName(),
            email: this.newProfessionalEmail(),
            specialties: this.newProfessionalSpecialties(),
        });
        this.showFeedback('Profissional adicionado com sucesso', 'success');
        this.resetNewProfessionalForm();
    }

    startEditProfessional(pro: User) {
        this.showAddProfessionalForm.set(false);
        this.editingProfessional.set(pro);
        this.editingProfessionalName.set(pro.name);
        this.editingProfessionalEmail.set(pro.email);
        // Logic to set specialties would go here
    }

    updateProfessional() {
        // Implementar lógica de atualização
        if (!this.editingProfessional()) return;
        console.log("Update professional:", {
            id: this.editingProfessional().id,
            name: this.editingProfessionalName(),
            email: this.editingProfessionalEmail(),
            specialties: this.editingProfessionalSpecialties(),
        });
        this.showFeedback('Profissional atualizado com sucesso', 'success');
        this.editingProfessional.set(null);
        this.showAddProfessionalForm.set(false);
    }
}
