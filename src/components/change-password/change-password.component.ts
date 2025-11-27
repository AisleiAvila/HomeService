import { Component, ChangeDetectionStrategy, signal, inject, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../i18n.service';
import { AuthService } from '../../services/auth.service';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
    selector: 'app-change-password',
    standalone: true,
    imports: [CommonModule, FormsModule, I18nPipe],
    templateUrl: './change-password.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordComponent {
    // UI state
    currentPassword = signal('');
    newPassword = signal('');
    confirmNewPassword = signal('');
    isChanging = signal(false);
    errorMsg = signal('');
    successMsg = signal('');

    // Services
    private readonly auth = inject(AuthService);
    private readonly i18n = inject(I18nService);

    @Output() closeModal = new EventEmitter<void>();

    async changePassword() {
        this.errorMsg.set('');
        this.successMsg.set('');
        if (!this.currentPassword() || !this.newPassword() || !this.confirmNewPassword()) {
            this.errorMsg.set(this.i18n.translate('fillAllPasswordFields'));
            return;
        }
        if (this.newPassword().length < 6) {
            this.errorMsg.set(this.i18n.translate('passwordTooShort'));
            return;
        }
        if (this.newPassword() !== this.confirmNewPassword()) {
            this.errorMsg.set(this.i18n.translate('passwordsDoNotMatch'));
            return;
        }
        this.isChanging.set(true);
        try {
            await this.auth.changePassword(this.currentPassword(), this.newPassword());
            this.successMsg.set(this.i18n.translate('passwordChangedSuccessfully'));
            // reset fields
            this.currentPassword.set('');
            this.newPassword.set('');
            this.confirmNewPassword.set('');
            
            // Fechar o modal após 2 segundos
            setTimeout(() => {
                this.onCloseModal();
            }, 2000);
        } catch (e: any) {
            console.error('Erro ao alterar senha:', e);
            const errorMessage = e?.message || this.i18n.translate('errorChangingPassword');
            this.errorMsg.set(errorMessage);
        } finally {
            this.isChanging.set(false);
        }
    }

    onCloseModal() {
        this.closeModal.emit();
    }
}
