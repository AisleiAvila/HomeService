
import { Injectable, inject, signal, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { NotificationService } from './notification.service';
import { User, UserRole } from '../models/maintenance.models';
import { PostgrestError, AuthError } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabaseService = inject(SupabaseService);
  private notificationService = inject(NotificationService);

  // Signal for the detailed user profile from our 'users' table
  readonly appUser = signal<User | null>(null);

  constructor() {
    // Effect to fetch our custom user profile when the Supabase auth user changes
    effect(async () => {
      const authUser = this.supabaseService.currentUser();
      if (authUser) {
        const { data, error } = await this.supabaseService.client
          .from('users')
          .select('*')
          .eq('auth_id', authUser.id)
          .single();
        
        if (error) {
          console.error('Error fetching user profile:', error);
          this.appUser.set(null);
        } else {
          this.appUser.set(data as User);
        }
      } else {
        this.appUser.set(null);
      }
    }, { allowSignalWrites: true });
  }

  private handleError(error: AuthError | PostgrestError | null, context: string) {
    if (error) {
      console.error(`Error in ${context}:`, error);
      this.notificationService.addNotification(error.message);
    }
  }

  async login(email: string, password: string): Promise<void> {
    const { error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password,
    });
    this.handleError(error, 'login');
  }

  async register(name: string, email: string, password: string, role: UserRole): Promise<void> {
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });
    this.handleError(error, 'registering user');
    if (data.user) {
        this.notificationService.addNotification('Registration successful! Please check your email for a verification code.');
    }
  }

  async verifyOtp(email: string, token: string): Promise<void> {
    const { error } = await this.supabaseService.client.auth.verifyOtp({
        email,
        token,
        type: 'signup'
    });
    if (error) {
        this.handleError(error, 'verifying OTP');
    } else {
        this.notificationService.addNotification('Email verified successfully! You can now log in.');
    }
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // URL to redirect to after password reset
    });
    if (error) {
      this.handleError(error, 'sending password reset email');
    } else {
      this.notificationService.addNotification('Password reset link sent to your email.');
    }
  }

  async logout(): Promise<void> {
    const { error } = await this.supabaseService.client.auth.signOut();
    this.handleError(error, 'logout');
  }

  async updateUserProfile(updatedData: Partial<User>): Promise<void> {
    const user = this.appUser();
    if (!user) return;

    const { data, error } = await this.supabaseService.client
        .from('users')
        .update(updatedData)
        .eq('id', user.id)
        .select()
        .single();
    
    this.handleError(error, 'updating profile');
    if (data) {
        this.appUser.set(data as User);
        this.notificationService.addNotification('Profile updated successfully!');
    }
  }

  async uploadAvatar(file: File): Promise<void> {
    const user = this.appUser();
    if (!user) return;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.auth_id}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await this.supabaseService.client.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    this.handleError(uploadError, 'uploading avatar');

    if (!uploadError) {
        const { data } = this.supabaseService.client.storage
            .from('avatars')
            .getPublicUrl(filePath);

        if (data.publicUrl) {
            await this.updateUserProfile({ avatar_url: `${data.publicUrl}?t=${new Date().getTime()}` });
        }
    }
  }
}
