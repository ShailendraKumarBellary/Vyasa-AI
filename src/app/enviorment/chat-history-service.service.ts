import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenaiKeyService } from './openai-key.service';

export interface ChatTurn {
  user_email: string;
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatHistoryService {
  private supabase: SupabaseClient | null = null;
  private readonly STORAGE_PREFIX = 'vyasa_chat_history_';

  constructor(private openaiKeyService: OpenaiKeyService) {
    const url = this.openaiKeyService.getSupabaseUrl();
    const key = this.openaiKeyService.getSupabaseKey();

    // Supabase client preserved for future database synchronization
    if (url && key) {
      this.supabase = createClient(url, key);
    } else {
      console.warn('Supabase URL or Key is missing in OpenaiKeyService');
    }
  }

  /**
   * Helper method to derive session key based on email
   */
  private getStorageKey(email: string): string {
    return `${this.STORAGE_PREFIX}${email}`;
  }

  /**
   * Saves each question/answer turn to browser sessionStorage.
   * Auto-clears when the window or tab is closed/refreshed.
   */
  async saveMessage(email: string, role: 'user' | 'assistant', content: string): Promise<void> {
    if (!email) return;

    try {
      const history = await this.getUserHistory(email);
      const newTurn: ChatTurn = { user_email: email, role, content };
      history.push(newTurn);

      sessionStorage.setItem(this.getStorageKey(email), JSON.stringify(history));
    } catch (err) {
      console.error('Failed to save chat to sessionStorage:', err);
    }
  }

  /**
   * Fetches active conversation history from sessionStorage for the current session.
   */
  async getUserHistory(email: string): Promise<ChatTurn[]> {
    if (!email) return [];

    try {
      const storedData = sessionStorage.getItem(this.getStorageKey(email));
      return storedData ? (JSON.parse(storedData) as ChatTurn[]) : [];
    } catch (err) {
      console.error('Failed to fetch chat history from sessionStorage:', err);
      return [];
    }
  }

  /**
   * Explicitly clears session history if needed (e.g., during logout or session end).
   */
  clearSessionHistory(email: string): void {
    if (email) {
      sessionStorage.removeItem(this.getStorageKey(email));
    }
  }
}