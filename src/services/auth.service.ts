
import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { NotificationService } from './notification.service';
import { User } from '../models/maintenance.models';
import { User as SupabaseUser } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private notificationService = inject(NotificationService);

  private supabaseUser = this.supabase.currentUser;
  readonly appUser = signal<User | null>(null);

  isLoggedIn = computed(() => !!this.appUser());

  constructor() {
    this.supabase.client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await this.fetchAppUser(session.user);
      } else {
        this.appUser.set(null);
      }
    });
  }

  async fetchAppUser(supabaseUser: SupabaseUser) {
    const { data, error } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('auth_id', supabaseUser.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Ignore 'exact one row not found'
      console.error('Error fetching app user:', error);
      this.notificationService.addNotification('Failed to load user profile.');
    } else {
      this.appUser.set(data as User);
    }
  }
  
  async login(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) {
      this.notificationService.addNotification(error.message);
    }
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email);
    if (error) {
      this.notificationService.addNotification(error.message);
    } else {
      this.notificationService.addNotification('Password reset link sent! Check your email.');
    }
  }

  async register(name: string, email: string, password: string, role: 'client' | 'professional'): Promise<void> {
    const { data, error } = await this.supabase.client.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          name: name,
          role: role,
        }
      }
    });

    if (error) {
      this.notificationService.addNotification(error.message);
    } else if (data.user) {
      this.notificationService.addNotification('Registration successful! Please check your email to verify your account.');
      // The onAuthStateChange listener will handle fetching the app user after verification.
    }
  }

  async verifyOtp(email: string, token: string) {
    const { error } = await this.supabase.client.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if(error) {
      this.notificationService.addNotification(error.message);
    } else {
      this.notificationService.addNotification("Verification successful. You are now logged in.");
      // onAuthStateChange will trigger and user profile will be fetched
    }
  }

  async logout(): Promise<void> {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) {
      this.notificationService.addNotification(error.message);
    }
  }

  async updateUserProfile(updates: Partial<User>): Promise<void> {
    const user = this.appUser();
    if (!user) return;

    const { data, error } = await this.supabase.client
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) {
      this.notificationService.addNotification(error.message);
    } else if(data) {
      this.appUser.set(data as User);
      this.notificationService.addNotification('Profile updated successfully!');
    }
  }

  async uploadAvatar(file: File): Promise<void> {
    const user = this.appUser();
    if (!user) return;

    const filePath = `${user.auth_id}/${Date.now()}`;
    const { error: uploadError } = await this.supabase.client.storage
        .from('avatars')
        .upload(filePath, file);
    
    if (uploadError) {
        this.notificationService.addNotification(`Upload error: ${uploadError.message}`);
        return;
    }

    const { data } = this.supabase.client.storage.from('avatars').getPublicUrl(filePath);
    
    if (data.publicUrl) {
      await this.updateUserProfile({ avatar_url: data.publicUrl });
    }
  }
}
