import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  username = '';
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  onRegister() {
    // Basic validation
    if (!this.username || !this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const registerData = {
      username: this.username.trim(),
      email: this.email.trim(),
      password: this.password,
      admin_code: null
    };

    console.log('Sending registration data:', { ...registerData, password: '[HIDDEN]' });

    this.http.post('http://localhost:8000/api/auth/register', registerData, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);
        alert('Registration successful! Please log in.');
        this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Registration error:', error);
        this.isLoading = false;
        
        if (error.status === 0) {
          this.errorMessage = 'Unable to connect to server. Please check if the backend is running.';
        } else if (error.error && error.error.detail) {
          this.errorMessage = error.error.detail;
        } else if (error.error && typeof error.error === 'string') {
          this.errorMessage = error.error;
        } else {
          this.errorMessage = `Registration failed: ${error.message || 'Unknown error'}`;
        }
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Clear error message when user starts typing
  onInputChange() {
    this.errorMessage = '';
  }
}