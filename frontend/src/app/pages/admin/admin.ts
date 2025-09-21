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
  description?: string;
}

interface SweetForm {
  name: string;
  category: string;
  price: number;
  quantity: number;
  description: string;
}

@Component({
  selector: 'app-admin',
  imports: [FormsModule, CommonModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin {
  sweets: Sweet[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Modal states
  showAddModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showRestockModal = false;
  
  // Form data
  sweetForm: SweetForm = {
    name: '',
    category: '',
    price: 0,
    quantity: 0,
    description: ''
  };
  
  selectedSweet: Sweet | null = null;
  restockQuantity = 0;

  // Search and filter
  searchName = '';
  searchCategory = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if user is admin
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    if (!isAdmin) {
      alert('Access denied. Admin privileges required.');
      this.router.navigate(['/dashboard']);
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
    
    this.http.get<Sweet[]>('http://localhost:8000/api/sweets', this.getAuthHeaders())
      .subscribe({
        next: (sweets) => {
          this.sweets = sweets;
          this.isLoading = false;
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = this.getErrorMsg(err, 'Failed to load sweets.');
          this.isLoading = false;
          
          if (err.status === 401) {
            localStorage.clear();
            this.router.navigate(['/login']);
          }
        }
      });
  }

  onSearch() {
    this.errorMessage = '';
    
    const params: any = {};
    if (this.searchName.trim()) params.name = this.searchName.trim();
    if (this.searchCategory.trim()) params.category = this.searchCategory.trim();
    if (this.minPrice !== null && this.minPrice !== undefined) params.min_price = this.minPrice;
    if (this.maxPrice !== null && this.maxPrice !== undefined) params.max_price = this.maxPrice;
    
    this.http.get<Sweet[]>('http://localhost:8000/api/sweets/search', {
      params,
      ...this.getAuthHeaders()
    }).subscribe({
      next: (sweets) => {
        this.sweets = sweets;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = this.getErrorMsg(err, 'Search failed.');
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

  openAddModal() {
    this.resetForm();
    this.showAddModal = true;
  }

  openEditModal(sweet: Sweet) {
    this.selectedSweet = sweet;
    this.sweetForm = {
      name: sweet.name,
      category: sweet.category,
      price: sweet.price,
      quantity: sweet.quantity,
      description: sweet.description || ''
    };
    this.showEditModal = true;
  }

  openDeleteModal(sweet: Sweet) {
    this.selectedSweet = sweet;
    this.showDeleteModal = true;
  }

  openRestockModal(sweet: Sweet) {
    this.selectedSweet = sweet;
    this.restockQuantity = 0;
    this.showRestockModal = true;
  }

  closeModals() {
    this.showAddModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.showRestockModal = false;
    this.selectedSweet = null;
    this.resetForm();
  }

  resetForm() {
    this.sweetForm = {
      name: '',
      category: '',
      price: 0,
      quantity: 0,
      description: ''
    };
  }

  addSweet() {
    if (!this.validateForm()) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.http.post<Sweet>('http://localhost:8000/api/sweets', this.sweetForm, this.getAuthHeaders())
      .subscribe({
        next: (newSweet) => {
          this.sweets.unshift(newSweet);
          this.successMessage = 'Sweet added successfully!';
          this.closeModals();
          this.isLoading = false;
          this.clearMessages();
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = this.getErrorMsg(err, 'Failed to add sweet.');
          this.isLoading = false;
        }
      });
  }

  editSweet() {
    if (!this.selectedSweet || !this.validateForm()) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.http.put<Sweet>(`http://localhost:8000/api/sweets/${this.selectedSweet.id}`, this.sweetForm, this.getAuthHeaders())
      .subscribe({
        next: (updatedSweet) => {
          const index = this.sweets.findIndex(s => s.id === updatedSweet.id);
          if (index !== -1) {
            this.sweets[index] = updatedSweet;
          }
          this.successMessage = 'Sweet updated successfully!';
          this.closeModals();
          this.isLoading = false;
          this.clearMessages();
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = this.getErrorMsg(err, 'Failed to update sweet.');
          this.isLoading = false;
        }
      });
  }

  deleteSweet() {
    if (!this.selectedSweet) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.http.delete(`http://localhost:8000/api/sweets/${this.selectedSweet.id}`, this.getAuthHeaders())
      .subscribe({
        next: () => {
          this.sweets = this.sweets.filter(s => s.id !== this.selectedSweet!.id);
          this.successMessage = 'Sweet deleted successfully!';
          this.closeModals();
          this.isLoading = false;
          this.clearMessages();
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = this.getErrorMsg(err, 'Failed to delete sweet.');
          this.isLoading = false;
        }
      });
  }

  restockSweet() {
    if (!this.selectedSweet || this.restockQuantity <= 0) {
      this.errorMessage = 'Please enter a valid quantity greater than 0.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.http.post(`http://localhost:8000/api/sweets/${this.selectedSweet.id}/restock`, 
      { quantity: this.restockQuantity }, 
      this.getAuthHeaders())
      .subscribe({
        next: (response: any) => {
          const index = this.sweets.findIndex(s => s.id === this.selectedSweet!.id);
          if (index !== -1) {
            this.sweets[index].quantity = response.new_quantity;
          }
          this.successMessage = `Sweet restocked successfully! New quantity: ${response.new_quantity}`;
          this.closeModals();
          this.isLoading = false;
          this.clearMessages();
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = this.getErrorMsg(err, 'Failed to restock sweet.');
          this.isLoading = false;
        }
      });
  }

  validateForm(): boolean {
    if (!this.sweetForm.name.trim()) {
      this.errorMessage = 'Sweet name is required.';
      return false;
    }
    if (!this.sweetForm.category.trim()) {
      this.errorMessage = 'Category is required.';
      return false;
    }
    if (this.sweetForm.price <= 0) {
      this.errorMessage = 'Price must be greater than 0.';
      return false;
    }
    if (this.sweetForm.quantity < 0) {
      this.errorMessage = 'Quantity cannot be negative.';
      return false;
    }
    return true;
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
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
    }
    
    return `${fallback} (Status: ${err.status})`;
  }

  private clearMessages() {
    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 3000);
  }

  trackBySweet(index: number, sweet: Sweet): number {
    return sweet.id;
  }
}
