import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { I18nService } from '../../i18n.service';
import { AuthService } from '../../services/auth.service';
import { DailyMileageService } from '../../services/daily-mileage.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-mileage-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mileage-report.component.html',
  styleUrls: ['./mileage-report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MileageReportComponent implements OnInit {
  private readonly dailyMileageService = inject(DailyMileageService);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly dataService = inject(DataService);

  // Filtros
  startDate = signal<string>('');
  endDate = signal<string>('');
  selectedProfessional = signal<number | null>(null);

  // Dados
  currentUser = this.authService.appUser;
  professionals = computed(() => 
    this.dataService.users().filter(user => 
      user.role === 'professional' || user.role === 'professional_almoxarife'
    )
  );
  dailyMileages = this.dailyMileageService.dailyMileages;
  fuelings = this.dailyMileageService.fuelings;

  // Dados filtrados
  filteredMileages = computed(() => {
    let mileages = this.dailyMileages();

    // Filtro por data
    if (this.startDate()) {
      mileages = mileages.filter(m => m.date >= this.startDate());
    }
    if (this.endDate()) {
      mileages = mileages.filter(m => m.date <= this.endDate());
    }

    // Filtro por profissional
    if (this.selectedProfessional()) {
      mileages = mileages.filter(m => m.professional_id === this.selectedProfessional());
    }

    return mileages.sort((a, b) => a.date.localeCompare(b.date));
  });

  // Totais
  totalKilometers = computed(() => {
    return this.filteredMileages().reduce((sum, m) => {
      return sum + (m.end_kilometers ? m.end_kilometers - m.start_kilometers : 0);
    }, 0);
  });

  totalFueling = computed(() => {
    return this.filteredMileages().reduce((sum, m) => {
      const mileageFuelings = this.fuelings().filter(f => f.daily_mileage_id === m.id);
      return sum + mileageFuelings.reduce((fuelSum, f) => fuelSum + f.value, 0);
    }, 0);
  });

  // Carregar dados
  async ngOnInit() {
    await this.loadData();
  }

  private async loadData() {
    await this.dailyMileageService.loadAllDailyMileages();
    await this.dailyMileageService.loadAllFuelings();
    await this.dataService.reloadUsers();
  }

  private async loadProfessionals() {
    // Implementar carregamento de profissionais
    // Por enquanto, usar dados mock ou do dataService
  }

  // Gerar relatório PDF
  async generateReport() {
    const doc = new jsPDF();

    // Configurações da página
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Função auxiliar para adicionar texto com quebra de linha
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      doc.text(text, x, y, options);
      return y + 7; // Altura aproximada da linha
    };

    // Header - Logotipo
    try {
      // Tentar carregar o logotipo como base64
      const response = await fetch('assets/logo-new.png');
      const blob = await response.blob();
      const reader = new FileReader();
      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const logoData = reader.result as string;
      doc.addImage(logoData, 'PNG', margin, yPosition, 50, 20);
      yPosition += 25;
    } catch (error) {
      console.warn('Erro ao carregar logotipo:', error);
      yPosition += 10;
    }

    // Título do relatório
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    yPosition = addText('Relatório de Quilometragem Diária', pageWidth / 2, yPosition, { align: 'center' });

    // Nome do usuário
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    yPosition = addText(`Emitido por: ${this.currentUser()?.name || 'Usuário'}`, pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 10;

    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Filtros aplicados
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    yPosition = addText('Filtros Aplicados:', margin, yPosition);

    doc.setFont('helvetica', 'normal');
    if (this.startDate()) {
      yPosition = addText(`Data Inicial: ${this.formatDate(this.startDate())}`, margin + 10, yPosition);
    }
    if (this.endDate()) {
      yPosition = addText(`Data Final: ${this.formatDate(this.endDate())}`, margin + 10, yPosition);
    }
    if (this.selectedProfessional()) {
      const professional = this.professionals().find(p => p.id === this.selectedProfessional());
      yPosition = addText(`Profissional: ${professional?.name || 'N/A'}`, margin + 10, yPosition);
    }

    yPosition += 10;

    // Tabela de dados
    const tableData = this.filteredMileages().map(mileage => {
      const professional = this.professionals().find(p => p.id === mileage.professional_id);
      const mileageFuelings = this.fuelings().filter(f => f.daily_mileage_id === mileage.id);
      const totalFueling = mileageFuelings.reduce((sum, f) => sum + f.value, 0);
      const kilometersDriven = mileage.end_kilometers ? mileage.end_kilometers - mileage.start_kilometers : 0;

      return [
        this.formatDate(mileage.date),
        professional?.name || 'N/A',
        mileage.license_plate || '',
        mileage.start_kilometers.toString(),
        mileage.end_kilometers?.toString() || '',
        kilometersDriven.toString(),
        `€${totalFueling.toFixed(2)}`
      ];
    });

    // Adicionar linha de totais
    if (tableData.length > 0) {
      tableData.push([
        'TOTAL',
        '',
        '',
        '',
        '',
        this.totalKilometers().toString(),
        `€${this.totalFueling().toFixed(2)}`
      ]);
    }

    // Configurar autoTable
    (doc as any).autoTable({
      startY: yPosition,
      head: [['Data', 'Profissional', 'Matrícula', 'Inicial', 'Final', 'Quilometragem', 'Abastecimento']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185], // Cor azul
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 10 },
      didDrawPage: (data: any) => {
        // Rodapé
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-PT')}`, margin, pageHeight - 10);
      }
    });

    // Salvar o PDF
    const fileName = `relatorio-quilometragem-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT');
  }

  // Método para carregar profissionais (placeholder)
  private async loadProfessionalsData() {
    // Implementar carregamento de profissionais
    // Por exemplo: this.professionals.set(await this.dataService.getProfessionals());
  }
}