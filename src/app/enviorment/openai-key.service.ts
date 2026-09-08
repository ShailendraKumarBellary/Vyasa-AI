import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OpenaiKeyService {

  constructor() { }
  private supabaseUrl: string = 'https://jslfexduhlngxhavvxbq.supabase.co';
  private supabaseKey: string = 'sb_publishable_CdPxZN3qKSu8ZjM2TV6nzg__eSyaxqT';

  
  getSupabaseUrl(): string {
    return this.supabaseUrl;
  }
  getSupabaseKey(): string {
    return this.supabaseKey;
  }
}
