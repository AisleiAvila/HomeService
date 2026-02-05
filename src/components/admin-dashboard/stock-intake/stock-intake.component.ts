// Garantir que o arquivo é tratado como módulo TypeScript
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nPipe } from '../../../pipes/i18n.pipe';
import { WarehouseService } from '../../../services/warehouse.service';
import { InventoryService } from '../../../services/inventory.service';
import { NotificationService } from '../../../services/notification.service';

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

	// Signals for filters
	readonly showFilters = signal(false);
	readonly filterProduct = signal('');
	readonly filterBarcode = signal('');
	readonly filterSupplier = signal('');
	readonly filterWarehouse = signal('');
	readonly filterDateStart = signal('');
	readonly filterDateEnd = signal('');

	// Stock items (simulate signal from service)
	readonly stockItems = signal([]); // Inicialmente vazio


	// Carregar itens do estoque ao inicializar (padrão signals)
	constructor() {
		effect(() => {
			this.loadStockItems();
			this.warehouseService.fetchWarehouses();
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
		if (this.filterDateStart()) {
			items = items.filter(i => i.received_at && i.received_at >= this.filterDateStart());
		}
		if (this.filterDateEnd()) {
			items = items.filter(i => i.received_at && i.received_at <= this.filterDateEnd());
		}
		return items;
	});

	// Total materials
	readonly totalMaterials = computed(() => this.filteredStockItems().length);

	// Helpers
	hasActiveFilters = () => {
		return !!(
			this.filterProduct() ||
			this.filterBarcode() ||
			this.filterSupplier() ||
			this.filterWarehouse() ||
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
		this.filterDateStart.set('');
		this.filterDateEnd.set('');
	}

	goToRegister() {
		// Navegação para tela de cadastro de material
		this.notificationService.addNotification('Navegar para cadastro de material');
		// Implemente navegação real conforme o roteamento da sua aplicação
	}
}
