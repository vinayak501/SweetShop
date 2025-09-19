import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [FormsModule,RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  username = '';
  email = '';
  password = '';

  constructor(private http: HttpClient) {}

  onRegister() {
    this.http.post('http://localhost:8000/api/auth/register', {
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => alert('Registration successful! Please log in.'),
      error: (err) => alert('Registration failed: ' + err.error.detail)
    });
  }
}
