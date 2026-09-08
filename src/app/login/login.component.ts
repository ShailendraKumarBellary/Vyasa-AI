import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../shared/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  name: string = '';
  email: string = '';
  errorMessage: string = '';
  private emailRegex: RegExp =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onLogin(): void { 
    debugger;
    this.errorMessage = '';

    if (!this.email || !this.email.trim()) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }

    if (!this.emailRegex.test(this.email.trim())) {
      this.errorMessage =
        'Please enter a valid email address (e.g., user@domain.com).';
      return;
    }
    if (this.email.trim()) {
      this.authService.setCurrentEmail(this.email.trim());
      this.router.navigate(['/home']);
    }
  }
}
