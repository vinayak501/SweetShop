import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Sweet {
  id: number;
  name: string;
  category: string;
  price: number;
  quantity: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  sweets: Sweet[] = [];
  errorMessage = '';
  successMessage = '';
  purchasingId: number | null = null;
  isLoading = false;

  // Search state
  searchName = '';
  searchCategory = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      this.router.navigate(['/login']);
      return;
    }
    this.loadSweets();
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return {};
    }
    return { 
      headers: new HttpHeaders({ 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }) 
    };
  }

  loadSweets() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    console.log('Loading sweets...');
    
    this.http.get<Sweet[]>('http://localhost:8000/api/sweets', this.getAuthHeaders())
      .subscribe({
        next: (sweets) => {
          console.log('Sweets loaded:', sweets);
          this.sweets = sweets;
          this.isLoading = false;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error loading sweets:', err);
          this.errorMessage = this.getErrorMsg(err, 'Failed to load sweets.');
          this.isLoading = false;
          
          // If unauthorized, redirect to login
          if (err.status === 401) {
            localStorage.removeItem('token');
            this.router.navigate(['/login']);
          }
        }
      });
  }

  onSearch() {
    this.errorMessage = '';
    this.successMessage = '';
    
    const params: any = {};
    if (this.searchName.trim()) params.name = this.searchName.trim();
    if (this.searchCategory.trim()) params.category = this.searchCategory.trim();
    if (this.minPrice !== null && this.minPrice !== undefined) params.min_price = this.minPrice;
    if (this.maxPrice !== null && this.maxPrice !== undefined) params.max_price = this.maxPrice;
    
    console.log('Searching with params:', params);
    
    this.http.get<Sweet[]>('http://localhost:8000/api/sweets/search', {
      params,
      ...this.getAuthHeaders()
    }).subscribe({
      next: (sweets) => {
        console.log('Search results:', sweets);
        this.sweets = sweets;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Search error:', err);
        this.errorMessage = this.getErrorMsg(err, 'Search failed.');
        
        if (err.status === 401) {
          localStorage.removeItem('token');
          this.router.navigate(['/login']);
        }
      }
    });
  }

  clearSearch() {
    this.searchName = '';
    this.searchCategory = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.loadSweets();
  }

  purchaseSweet(sweet: Sweet) {
    if (sweet.quantity === 0 || this.purchasingId === sweet.id) {
      console.log('Cannot purchase:', sweet.quantity === 0 ? 'Out of stock' : 'Already purchasing');
      return;
    }
    
    console.log('Purchasing sweet:', sweet);
    
    this.purchasingId = sweet.id;
    this.errorMessage = '';
    this.successMessage = '';
    
    this.http.post<any>(
      `http://localhost:8000/api/sweets/${sweet.id}/purchase`,
      { quantity: 1 },
      this.getAuthHeaders()
    ).subscribe({
      next: (res) => {
        console.log('Purchase successful:', res);
        this.successMessage = `Successfully purchased ${sweet.name}!`;
        sweet.quantity = res.remaining_quantity || (sweet.quantity - 1);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Purchase error:', err);
        this.errorMessage = this.getErrorMsg(err, 'Purchase failed.');
        
        if (err.status === 401) {
          localStorage.removeItem('token');
          this.router.navigate(['/login']);
        }
      },
      complete: () => {
        this.purchasingId = null;
      }
    });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('token_type');
    this.router.navigate(['/login']);
  }

  private getErrorMsg(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 0) {
      return 'Unable to connect to server. Please check if the backend is running.';
    }
    
    if (err.error) {
      if (typeof err.error === 'string') {
        return err.error;
      }
      if (err.error.detail) {
        return err.error.detail;
      }
      if (err.error.message) {
        return err.error.message;
      }
    }
    
    return `${fallback} (Status: ${err.status})`;
  }
}
