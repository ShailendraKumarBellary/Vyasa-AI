import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { OpenaiKeyService } from '../enviorment/openai-key.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient | null = null;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor(
    private OpenaiKeyService: OpenaiKeyService,
    private router: Router
  ) {
    const url = this.OpenaiKeyService.getSupabaseUrl();
    const key = this.OpenaiKeyService.getSupabaseKey();

    if (url && key) {
      this.supabase = createClient(url, key);
      this.loadSession();
    }
  }

  private async loadSession(): Promise<void> {
    if (!this.supabase) return;
    const { data } = await this.supabase.auth.getSession();
    if (data.session) {
      this.currentUserSubject.next(data.session.user);
    }

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUserSubject.next(session?.user || null);
    });
  }

  async login(email: string): Promise<boolean> {
    if (!this.supabase) return false;

    // Standard magic link passwordless login
    const { error } = await this.supabase.auth.signInWithOtp({ email });
    if (error) {
      console.error('Login error:', error.message);
      return false;
    }
    return true;
  }

  // Fallback direct sign-in method if using stored email states
  setCurrentEmail(email: string): void {
    localStorage.setItem('user_email', email);
    this.currentUserSubject.next({ email } as User);
  }

  getUserEmail(): string | null {
    return this.currentUserSubject.value?.email || localStorage.getItem('user_email');
  }

  async logout(): Promise<void> {
    if (this.supabase) {
      await this.supabase.auth.signOut();
    }
    localStorage.removeItem('user_email');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
}