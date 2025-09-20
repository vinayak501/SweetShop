import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';

  constructor(private http: HttpClient, private router: Router) { }


  onLogin() {
    this.http.post('http://localhost:8000/api/auth/login', {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res: any) => {
        localStorage.setItem('token', res.access_token);
        this.router.navigate(['dashboard'])
        alert('Login successful!');
      },
      error: (err) => alert('Login failed: ' + err.error.detail)
    });
  }
}
