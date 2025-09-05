import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// IMPORTANT: In a real application, these should be stored in environment variables
// and not hardcoded.
const SUPABASE_URL = 'https://uqrvenlkquheajuveggv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  // FIX: Provide a public Supabase client instance.
  public readonly client: SupabaseClient;
  
  // FIX: Provide a signal for the current authenticated user.
  readonly currentUser = signal<User | null>(null);

  constructor() {
    // FIX: Initialize the Supabase client. This service was previously empty.
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // FIX: Listen to auth state changes and update a signal.
    // This makes user state reactive throughout the application.
    this.client.auth.onAuthStateChange((_event, session) => {
      this.currentUser.set(session?.user ?? null);
    });
  }
}
