import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal, effect, OnInit } from "@angular/core";
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
export class ProfessionalsManagementComponent implements OnInit {
                // Ordenação
                sortColumn = signal<'name' | 'email' | 'specialties'>('name');
                sortDirection = signal<'asc' | 'desc'>('asc');

                setSort(column: 'name' | 'email' | 'specialties') {
                    if (this.sortColumn() === column) {
                        this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
                    } else {
                        this.sortColumn.set(column);
                        this.sortDirection.set('asc');
                    }
                }
            constructor() {
                // Sempre que busca ou filtro mudam, volta para página 1
                effect(() => {
                    this.searchTerm();
                    this.filterSpecialty();
                    this.currentPage.set(1);
                });
            }

            ngOnInit(): void {
                this.dataService.loadInitialData();
            }
        // Paginação: total de páginas
        totalPages = computed(() => {
            const total = this.filteredProfessionals().length;
            return Math.max(1, Math.ceil(total / this.pageSize));
        });

        prevPage() {
            if (this.currentPage() > 1) {
                this.currentPage.set(this.currentPage() - 1);
            }
        }

        nextPage() {
            if (this.currentPage() < this.totalPages()) {
                this.currentPage.set(this.currentPage() + 1);
            }
        }
    // Busca e filtro
    public searchTerm = signal("");
    public filterSpecialty = signal<string>("");

    filteredProfessionals = computed(() => {
        const term = this.searchTerm().toLowerCase();
        const specialty = this.filterSpecialty();
        const sortCol = this.sortColumn();
        const sortDir = this.sortDirection();
        let arr = this.professionals().filter((pro) => {
            const matchesName = pro.name?.toLowerCase().includes(term);
            const matchesEmail = pro.email?.toLowerCase().includes(term);
            const specialtiesArr = pro.specialties?.map(s => typeof s === 'string' ? s : s.name) || [];
            const matchesSpecialty = !specialty || specialtiesArr.includes(specialty);
            const matchesSearch = !term || matchesName || matchesEmail || specialtiesArr.some(s => s?.toLowerCase().includes(term));
            return matchesSearch && matchesSpecialty;
        });
        arr = arr.slice(); // Defensive copy
        arr.sort((a, b) => {
            let aVal, bVal;
            if (sortCol === 'name') {
                aVal = a.name?.toLowerCase() || '';
                bVal = b.name?.toLowerCase() || '';
            } else if (sortCol === 'email') {
                aVal = a.email?.toLowerCase() || '';
                bVal = b.email?.toLowerCase() || '';
            } else if (sortCol === 'specialties') {
                aVal = (a.specialties?.map(s => typeof s === 'string' ? s : s.name).join(', ') || '').toLowerCase();
                bVal = (b.specialties?.map(s => typeof s === 'string' ? s : s.name).join(', ') || '').toLowerCase();
            }
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return arr;
    });

    // Paginação
    pageSize = 10;
    currentPage = signal(1);

    paginatedProfessionals = computed(() => {
        const all = this.filteredProfessionals();
        const start = (this.currentPage() - 1) * this.pageSize;
        return all.slice(start, start + this.pageSize);
    });
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
            (u) => u.role === "professional"
        );
    });

    allCategories = computed(() => this.dataService.categories());

    // Add Professional Form
    showAddProfessionalForm = signal(false);
    newProfessionalName = signal("");
    newProfessionalEmail = signal("");

    newProfessionalSpecialties = signal<ServiceCategory[]>([]);
    newProfessionalPhone = signal("");

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
        // Novo fluxo: cria profissional via AuthService para garantir envio de e-mail
        const name = this.newProfessionalName();
        const email = this.newProfessionalEmail();
        const specialties = this.newProfessionalSpecialties();
        const phone = this.newProfessionalPhone();

        // Validação extra (defensiva)
        if (!name || !email || specialties.length === 0 || !phone) {
            this.showFeedback('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        // Gera senha temporária segura para o profissional
        const tempPassword = Math.random().toString(36).slice(-10) + "A1!";

        // Gera token único para confirmação
        const token = crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now();
        const confirmLink = `https://home-service-nu.vercel.app/confirm?email=${encodeURIComponent(email)}&token=${token}`;
        const html = `<p>Olá ${name},</p><p>Seu cadastro como profissional foi realizado com sucesso.<br>Por favor, confirme seu e-mail clicando no link abaixo:</p><p><a href='${confirmLink}'>Confirmar e-mail</a></p>`;

        // Chama AuthService.register para criar usuário no Supabase Auth
        this.dataService.authService.register(name, email, tempPassword, "professional")
            .then(async () => {
                // Após registro, salva dados extras na tabela users
                await this.dataService.updateProfessionalExtras(email, specialties, phone);

                // Envia e-mail de confirmação via endpoint customizado
                fetch("http://localhost:4001/api/send-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: email,
                        subject: "Confirmação de cadastro - HomeService",
                        html,
                        token
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        this.showFeedback('Profissional cadastrado! E-mail de confirmação enviado.', 'success');
                    } else {
                        this.showFeedback('Profissional cadastrado, mas falha ao enviar e-mail.', 'error');
                    }
                    this.resetNewProfessionalForm();
                })
                .catch(() => {
                    this.showFeedback('Profissional cadastrado, mas erro ao enviar e-mail.', 'error');
                    this.resetNewProfessionalForm();
                });
            })
            .catch((err) => {
                this.showFeedback('Erro ao cadastrar profissional: ' + (err?.message || err), 'error');
            });
    }

    startEditProfessional(pro: User) {
        // Ao iniciar edição, garantir que o formulário de adição não seja exibido
        this.showAddProfessionalForm.set(false);
        this.editingProfessional.set(pro);
        this.editingProfessionalName.set(pro.name);
        this.editingProfessionalEmail.set(pro.email);
        // Logic to set specialties would go here
    }

    cancelEditProfessional() {
        this.editingProfessional.set(null);
        // Não reexibe o formulário de adição automaticamente
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
        // Não reexibe o formulário de adição automaticamente
    }
}
