import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';
  loginAsAdmin = false;
  isLoading = false;
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) { }

  onLogin() {
    // Basic validation
    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const loginData = {
      email: this.email.trim(),
      password: this.password,
      ...(this.loginAsAdmin && { login_as_admin: true })
    };

    // Choose endpoint based on admin login checkbox
    const endpoint = this.loginAsAdmin 
      ? 'http://localhost:8000/api/auth/admin-login'
      : 'http://localhost:8000/api/auth/login';

    console.log('Attempting login:', { 
      email: this.email, 
      loginAsAdmin: this.loginAsAdmin,
      endpoint 
    });

    this.http.post(endpoint, loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: (res: any) => {
        console.log('Login successful:', res);
        
        if (res.access_token) {
          // Store authentication data
          localStorage.setItem('token', res.access_token);
          localStorage.setItem('token_type', res.token_type || 'bearer');
          localStorage.setItem('username', res.username || '');
          localStorage.setItem('is_admin', res.is_admin ? 'true' : 'false');

          // Show success message
          this.showToast('Login successful!', 'success');

          // Navigate based on admin status and login type
          if (this.loginAsAdmin && res.is_admin) {
            this.router.navigate(['/admin']);
          } else if (!this.loginAsAdmin) {
            this.router.navigate(['/dashboard']);
          }
        } else {
          this.errorMessage = 'Login response missing access token';
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Login error:', error);
        this.isLoading = false;
        
        if (error.status === 0) {
          this.errorMessage = 'Unable to connect to server. Please check if the backend is running.';
        } else if (error.status === 401) {
          this.errorMessage = 'Invalid email or password.';
        } else if (error.status === 403) {
          this.errorMessage = 'Access denied. You do not have admin privileges.';
          this.showToast('You cannot login as admin. Admin privileges required.', 'error');
        } else if (error.error && error.error.detail) {
          this.errorMessage = error.error.detail;
        } else {
          this.errorMessage = `Login failed: ${error.message || 'Unknown error'}`;
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

  onInputChange() {
    this.errorMessage = '';
  }

  private showToast(message: string, type: 'success' | 'error') {
    // Simple toast implementation - you can replace with a more sophisticated toast library
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-semibold z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  }
}