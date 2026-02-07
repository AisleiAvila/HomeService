import { Router } from '@angular/router';
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nPipe } from '../../../pipes/i18n.pipe';
import { I18nService } from '../../../i18n.service';
import { WarehouseService } from '../../../services/warehouse.service';
import { InventoryService } from '../../../services/inventory.service';
import { NotificationService } from '../../../services/notification.service';
import { StockItem } from '../../../models/maintenance.models';

@Component({
	selector: 'app-stock-intake',
	standalone: true,
	imports: [CommonModule, FormsModule, I18nPipe],
	templateUrl: './stock-intake.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockIntakeComponent {
	// Services
	private readonly inventoryService = inject(InventoryService);
	readonly warehouseService = inject(WarehouseService);
	private readonly notificationService = inject(NotificationService);
	private readonly i18n = inject(I18nService);
	private readonly router = inject(Router);

	// Signals for filters
	readonly showFilters = signal(false);
	readonly filterProduct = signal('');
	readonly filterBarcode = signal('');
	readonly filterSupplier = signal('');
	readonly filterWarehouse = signal('');
	readonly filterStatus = signal('');
	readonly filterDateStart = signal('');
	readonly filterDateEnd = signal('');

	readonly statusOptions = ['Recebido', 'Distribuído', 'Retirado', 'Instalado', 'Devolvido'] as const;

	// Stock items (simulate signal from service)
	readonly stockItems = signal<StockItem[]>([]); // Inicialmente vazio

	// Sorting signals (seguindo padrão de Solicitações)
	sortBy = signal<string>('received_at');
	sortOrder = signal<'asc' | 'desc'>('desc');

	// Pagination signals (seguindo padrão de Solicitações)
	currentPage = signal<number>(1);
	itemsPerPage = signal<number>(10);
	Math = Math;

	// Modal signals
	readonly showItemDetailsModal = signal(false);
	readonly selectedItem = signal<StockItem | null>(null);


	// Carregar itens do estoque ao inicializar (padrão signals)
	constructor() {
		// Restaurar estado se existir
		const savedState = sessionStorage.getItem('stockIntakeState');
		if (savedState) {
			try {
				const state = JSON.parse(savedState);
				this.filterProduct.set(state.filterProduct || '');
				this.filterBarcode.set(state.filterBarcode || '');
				this.filterSupplier.set(state.filterSupplier || '');
				this.filterWarehouse.set(state.filterWarehouse || '');
				this.filterStatus.set(state.filterStatus || '');
				this.filterDateStart.set(state.filterDateStart || '');
				this.filterDateEnd.set(state.filterDateEnd || '');
				this.sortBy.set(state.sortBy || 'received_at');
				this.sortOrder.set(state.sortOrder || 'desc');
				this.currentPage.set(state.currentPage || 1);
				this.itemsPerPage.set(state.itemsPerPage || 10);
				sessionStorage.removeItem('stockIntakeState');
			} catch (error) {
				console.error('Erro ao restaurar estado do estoque:', error);
			}
		}

		effect(() => {
			this.loadStockItems();
			this.warehouseService.fetchWarehouses();
		});

		// Sempre volta para a primeira página quando filtros/ordenação/tamanho mudam
		effect(() => {
			this.filterProduct();
			this.filterBarcode();
			this.filterSupplier();
			this.filterWarehouse();
			this.filterStatus();
			this.filterDateStart();
			this.filterDateEnd();
			this.sortBy();
			this.sortOrder();
			this.itemsPerPage();
			this.currentPage.set(1);
		});

		// Garante que a página atual não excede o total de páginas após filtrar
		effect(() => {
			const total = this.totalPages();
			if (this.currentPage() > total) {
				this.currentPage.set(Math.max(total, 1));
			}
		});
	}

	async loadStockItems() {
		const items = await this.inventoryService.fetchRecentStockItems(1000);
		this.stockItems.set(items);
	}

	// Filtered items
	readonly filteredStockItems = computed(() => {
		let items = this.stockItems();
		if (this.filterProduct()) {
			items = items.filter(i => i.product_name?.toLowerCase().includes(this.filterProduct().toLowerCase()));
		}
		if (this.filterBarcode()) {
			items = items.filter(i => i.barcode?.toLowerCase().includes(this.filterBarcode().toLowerCase()));
		}
		if (this.filterSupplier()) {
			items = items.filter(i => i.supplier?.toLowerCase().includes(this.filterSupplier().toLowerCase()));
		}
		if (this.filterWarehouse()) {
			items = items.filter(i => String(i.warehouse?.id ?? i.warehouse_id ?? '') === this.filterWarehouse());
		}
		if (this.filterStatus()) {
			items = items.filter(i => (i.status ?? '') === this.filterStatus());
		}
		if (this.filterDateStart()) {
			items = items.filter(i => i.received_at && i.received_at >= this.filterDateStart());
		}
		if (this.filterDateEnd()) {
			items = items.filter(i => i.received_at && i.received_at <= this.filterDateEnd());
		}
		return items;
	});

	readonly sortedStockItems = computed(() => {
		return this.sortStockItems(this.filteredStockItems());
	});

	readonly paginatedStockItems = computed(() => {
		const items = this.sortedStockItems();
		const start = (this.currentPage() - 1) * this.itemsPerPage();
		const end = start + this.itemsPerPage();
		return items.slice(start, end);
	});

	readonly totalPages = computed(() =>
		Math.ceil(this.sortedStockItems().length / this.itemsPerPage())
	);

	// Total materials
	readonly totalMaterials = computed(() => this.filteredStockItems().length);

	// Pagination helpers (mesmo padrão de Solicitações)
	get pageNumbers(): number[] {
		const total = this.totalPages();
		const current = this.currentPage();
		const pages: number[] = [];
		pages.push(1);
		let start = Math.max(2, current - 2);
		let end = Math.min(total - 1, current + 2);
		if (start > 2) pages.push(-1);
		for (let i = start; i <= end; i++) if (i !== 1 && i !== total) pages.push(i);
		if (end < total - 1) pages.push(-1);
		if (total > 1) pages.push(total);
		return pages;
	}

	previousPage() { if (this.currentPage() > 1) this.currentPage.update(p => p - 1); }
	nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
	goToPage(page: number) { if (page !== -1) this.currentPage.set(page); }
	setItemsPerPage(items: number) { this.itemsPerPage.set(items); this.currentPage.set(1); }

	// Sorting helpers (mesmo padrão de Solicitações)
	sortByColumn(column: string) {
		if (this.sortBy() === column) {
			this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
		} else {
			this.sortBy.set(column);
			this.sortOrder.set('desc');
		}
	}

	private sortStockItems(items: StockItem[]): StockItem[] {
		const sortBy = this.sortBy();
		const sortOrder = this.sortOrder();
		const multiplier = sortOrder === 'asc' ? 1 : -1;

		const toText = (value: unknown): string => {
			if (value === null || value === undefined) return '';
			if (typeof value === 'string') return value;
			if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
			return '';
		};

		const compareText = (a: unknown, b: unknown): number =>
			toText(a).localeCompare(toText(b), 'pt-PT', { sensitivity: 'base' });

		const compareNullableNumber = (aValue: number | null | undefined, bValue: number | null | undefined): number => {
			const aNum = typeof aValue === 'number' && Number.isFinite(aValue) ? aValue : null;
			const bNum = typeof bValue === 'number' && Number.isFinite(bValue) ? bValue : null;
			if (aNum === null && bNum === null) return 0;
			if (aNum === null) return 1;
			if (bNum === null) return -1;
			return aNum - bNum;
		};

		const parseDateTime = (raw?: string | null): number | null => {
			if (!raw) return null;
			const t = Date.parse(String(raw));
			return Number.isFinite(t) ? t : null;
		};

		return [...items].sort((a, b) => {
			switch (sortBy) {
				case 'received_at': {
					const aTime = parseDateTime(a.received_at);
					const bTime = parseDateTime(b.received_at);
					if (aTime === null && bTime === null) return 0;
					if (aTime === null) return 1;
					if (bTime === null) return -1;
					return (aTime - bTime) * multiplier;
				}
				case 'quantity':
					return compareNullableNumber(a.quantity, b.quantity) * multiplier;
				case 'product_name':
					return compareText(a.product_name ?? '', b.product_name ?? '') * multiplier;
				case 'barcode':
					return compareText(a.barcode ?? '', b.barcode ?? '') * multiplier;
				case 'supplier':
					return compareText(a.supplier ?? '', b.supplier ?? '') * multiplier;
				case 'warehouse':
					return compareText(a.warehouse?.name ?? '', b.warehouse?.name ?? '') * multiplier;
				case 'status':
					return compareText(a.status ?? '', b.status ?? '') * multiplier;
				default:
					return 0;
			}
		});
	}

	canRegisterWithdrawal(item: StockItem): boolean {
		return item?.status === 'Distribuído';
	}

	canRegisterReturn(item: StockItem): boolean {
		return item?.status === 'Distribuído' || item?.status === 'Retirado';
	}

	private updateLocalItem(updated: StockItem): void {
		this.stockItems.update((items) =>
			items.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
		);
	}

	async registerWithdrawal(item: StockItem): Promise<void> {
		if (!item?.id) return;
		if (!this.canRegisterWithdrawal(item)) {
			this.notificationService.addNotification(
				this.i18n.translate('invalidStatusTransition') ||
					'Não é possível registrar retirada para este status.'
			);
			return;
		}

		const confirm = globalThis.confirm(
			this.i18n.translate('confirmRegisterWithdrawal') ||
				'Deseja registrar a retirada deste item do armazém?'
		);
		if (!confirm) return;

		const updated = await this.inventoryService.transitionStockItemStatus(
			item.id,
			'Retirado',
			['Distribuído']
		);

		if (!updated) return;
		this.updateLocalItem(updated);
		this.notificationService.addNotification(
			this.i18n.translate('registerWithdrawal') || 'Retirada registrada.'
		);
	}

	async registerReturn(item: StockItem): Promise<void> {
		if (!item?.id) return;
		if (!this.canRegisterReturn(item)) {
			this.notificationService.addNotification(
				this.i18n.translate('invalidStatusTransition') ||
					'Não é possível registrar devolução para este status.'
			);
			return;
		}

		const confirm = globalThis.confirm(
			this.i18n.translate('confirmRegisterReturn') ||
				'Deseja registrar a devolução deste item?'
		);
		if (!confirm) return;

		const updated = await this.inventoryService.transitionStockItemStatus(
			item.id,
			'Devolvido',
			['Distribuído', 'Retirado']
		);

		if (!updated) return;
		this.updateLocalItem(updated);
		this.notificationService.addNotification(
			this.i18n.translate('registerReturn') || 'Devolução registrada.'
		);
	}

	// Helpers
	hasActiveFilters = () => {
		return !!(
			this.filterProduct() ||
			this.filterBarcode() ||
			this.filterSupplier() ||
			this.filterWarehouse() ||
			this.filterStatus() ||
			this.filterDateStart() ||
			this.filterDateEnd()
		);
	};

	getWarehouseName(id: string): string {
		const w = this.warehouseService.warehouses().find(w => String(w.id) === id);
		return w ? w.name : '-';
	}

	clearFilters() {
		this.filterProduct.set('');
		this.filterBarcode.set('');
		this.filterSupplier.set('');
		this.filterWarehouse.set('');
		this.filterStatus.set('');
		this.filterDateStart.set('');
		this.filterDateEnd.set('');
	}

	viewItem(item: StockItem) {
		if (!item) return;
		this.selectedItem.set(item);
		this.showItemDetailsModal.set(true);
	}

	closeItemDetailsModal() {
		this.showItemDetailsModal.set(false);
		this.selectedItem.set(null);
	}

	editItem(item: StockItem) {
		// Armazenar estado atual para restauração após edição
		const currentState = {
			filterProduct: this.filterProduct(),
			filterBarcode: this.filterBarcode(),
			filterSupplier: this.filterSupplier(),
			filterWarehouse: this.filterWarehouse(),
			filterStatus: this.filterStatus(),
			filterDateStart: this.filterDateStart(),
			filterDateEnd: this.filterDateEnd(),
			sortBy: this.sortBy(),
			sortOrder: this.sortOrder(),
			currentPage: this.currentPage(),
			itemsPerPage: this.itemsPerPage()
		};
		sessionStorage.setItem('stockIntakeState', JSON.stringify(currentState));

		// Navega para a página de registro com o item para edição
		this.router.navigate(['/admin/stock-register'], {
			queryParams: { editItem: JSON.stringify(item) }
		});
	}

	goToRegister() {
		// Navegação para tela de cadastro de material
		this.router.navigate(['/admin/stock-register']);
	}
}
