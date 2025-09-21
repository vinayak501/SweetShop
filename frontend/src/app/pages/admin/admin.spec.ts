import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Admin } from './admin';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('AdminPage', () => {
  let component: Admin;
  let fixture: ComponentFixture<Admin>;
  let httpMock: HttpTestingController;
  let router: Router;

  const mockSweets = [
    {
      id: 1,
      name: 'Chocolate Cake',
      category: 'Cakes',
      price: 500,
      quantity: 10,
      description: 'Delicious chocolate cake'
    },
    {
      id: 2,
      name: 'Vanilla Cupcake',
      category: 'Cupcakes',
      price: 150,
      quantity: 0,
      description: 'Sweet vanilla cupcake'
    },
    {
      id: 3,
      name: 'Strawberry Cookies',
      category: 'Cookies',
      price: 200,
      quantity: 5,
      description: 'Fresh strawberry cookies'
    }
  ];

  beforeEach(async () => {
    // Mock localStorage
    let store: { [key: string]: string } = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => store[key] = value);
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => delete store[key]);
    spyOn(localStorage, 'clear').and.callFake(() => store = {});

    // Mock alert
    spyOn(window, 'alert');

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, Admin]
    }).compileComponents();

    fixture = TestBed.createComponent(Admin);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    spyOn(router, 'navigate');
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should redirect non-admin users to dashboard', () => {
      localStorage.setItem('is_admin', 'false');

      component.ngOnInit();

      expect(window.alert).toHaveBeenCalledWith('Access denied. Admin privileges required.');
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should allow admin users and load sweets', () => {
      localStorage.setItem('is_admin', 'true');
      localStorage.setItem('token', 'fake-token');

      component.ngOnInit();

      const req = httpMock.expectOne('http://localhost:8000/api/sweets');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer fake-token');

      req.flush(mockSweets);
      expect(component.sweets).toEqual(mockSweets);
    });
  });

  describe('Authentication Headers', () => {
    it('should include authorization header when token exists', () => {
      localStorage.setItem('token', 'test-token');

      const headers = component['getAuthHeaders']();

      expect(headers.headers?.get('Authorization')).toBe('Bearer test-token');
      expect(headers.headers?.get('Content-Type')).toBe('application/json');
    });

    it('should redirect to login when no token exists', () => {
      component['getAuthHeaders']();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Load Sweets', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'fake-token');
    });

    it('should load sweets successfully', () => {
      component.loadSweets();

      const req = httpMock.expectOne('http://localhost:8000/api/sweets');
      req.flush(mockSweets);

      expect(component.sweets).toEqual(mockSweets);
      expect(component.isLoading).toBeFalsy();
      expect(component.errorMessage).toBe('');
    });

    it('should handle error when loading sweets', () => {
      component.loadSweets();

      const req = httpMock.expectOne('http://localhost:8000/api/sweets');
      req.flush({ detail: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });

      expect(component.errorMessage).toContain('Server error');
      expect(component.isLoading).toBeFalsy();
    });

    it('should redirect to login on 401 error', () => {
      component.loadSweets();

      const req = httpMock.expectOne('http://localhost:8000/api/sweets');
      req.flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      expect(localStorage.clear).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'fake-token');
    });

    it('should search sweets with all parameters', () => {
      component.searchName = 'Chocolate';
      component.searchCategory = 'Cakes';
      component.minPrice = 100;
      component.maxPrice = 600;

      component.onSearch();

      const req = httpMock.expectOne((request) =>
        request.url === 'http://localhost:8000/api/sweets/search' &&
        request.params.get('name') === 'Chocolate' &&
        request.params.get('category') === 'Cakes' &&
        request.params.get('min_price') === '100' &&
        request.params.get('max_price') === '600'
      );

      expect(req.request.method).toBe('GET');
      req.flush([mockSweets[0]]);

      expect(component.sweets).toEqual([mockSweets[0]]);
    });

    it('should clear search and reload sweets', () => {
      component.searchName = 'Test';
      component.searchCategory = 'Category';
      component.minPrice = 100;
      component.maxPrice = 500;

      component.clearSearch();

      expect(component.searchName).toBe('');
      expect(component.searchCategory).toBe('');
      expect(component.minPrice).toBeNull();
      expect(component.maxPrice).toBeNull();

      const req = httpMock.expectOne('http://localhost:8000/api/sweets');
      req.flush(mockSweets);
    });
  });

  describe('Modal Management', () => {
    it('should open add modal and reset form', () => {
      component.sweetForm.name = 'Old Name';

      component.openAddModal();

      expect(component.showAddModal).toBeTruthy();
      expect(component.sweetForm.name).toBe('');
    });

    it('should open edit modal with sweet data', () => {
      const sweet = mockSweets[0];

      component.openEditModal(sweet);

      expect(component.showEditModal).toBeTruthy();
      expect(component.selectedSweet).toBe(sweet);
      expect(component.sweetForm.name).toBe(sweet.name);
      expect(component.sweetForm.category).toBe(sweet.category);
    });

    it('should open delete modal', () => {
      const sweet = mockSweets[0];

      component.openDeleteModal(sweet);

      expect(component.showDeleteModal).toBeTruthy();
      expect(component.selectedSweet).toBe(sweet);
    });

    it('should open restock modal', () => {
      const sweet = mockSweets[0];

      component.openRestockModal(sweet);

      expect(component.showRestockModal).toBeTruthy();
      expect(component.selectedSweet).toBe(sweet);
      expect(component.restockQuantity).toBe(0);
    });

    it('should close all modals and reset state', () => {
      component.showAddModal = true;
      component.showEditModal = true;
      component.selectedSweet = mockSweets[0];
      component.sweetForm.name = 'Test';

      component.closeModals();

      expect(component.showAddModal).toBeFalsy();
      expect(component.showEditModal).toBeFalsy();
      expect(component.showDeleteModal).toBeFalsy();
      expect(component.showRestockModal).toBeFalsy();
      expect(component.selectedSweet).toBeNull();
      expect(component.sweetForm.name).toBe('');
    });
  });

  describe('Add Sweet', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'fake-token');
    });

    it('should add sweet successfully', () => {
      component.sweetForm = {
        name: 'New Sweet',
        category: 'Cakes',
        price: 300,
        quantity: 20,
        description: 'A new sweet'
      };

      component.addSweet();

      const req = httpMock.expectOne('http://localhost:8000/api/sweets');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(component.sweetForm);

      const newSweet = { id: 4, ...component.sweetForm };
      req.flush(newSweet);

      expect(component.sweets[0]).toEqual(newSweet);
      expect(component.successMessage).toContain('Sweet added successfully!');
      expect(component.showAddModal).toBeFalsy();
    });

    it('should validate form before adding', () => {
      component.sweetForm.name = '';

      component.addSweet();

      expect(component.errorMessage).toBe('Sweet name is required.');
      httpMock.expectNone('http://localhost:8000/api/sweets');
    });

    it('should handle add sweet error', () => {
      component.sweetForm = {
        name: 'New Sweet',
        category: 'Cakes',
        price: 300,
        quantity: 20,
        description: 'A new sweet'
      };

      component.addSweet();

      const req = httpMock.expectOne('http://localhost:8000/api/sweets');
      req.flush({ detail: 'Failed to add' }, { status: 400, statusText: 'Bad Request' });

      expect(component.errorMessage).toContain('Failed to add');
    });
  });

  describe('Edit Sweet', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'fake-token');
      component.sweets = [...mockSweets];
    });

    it('should edit sweet successfully', () => {
      const sweet = mockSweets[0];
      component.selectedSweet = sweet;
      component.sweetForm = {
        name: 'Updated Name',
        category: sweet.category,
        price: sweet.price,
        quantity: sweet.quantity,
        description: sweet.description || ''
      };

      component.editSweet();

      const req = httpMock.expectOne(`http://localhost:8000/api/sweets/${sweet.id}`);
      expect(req.request.method).toBe('PUT');

      const updatedSweet = { ...sweet, name: 'Updated Name' };
      req.flush(updatedSweet);

      expect(component.sweets[0].name).toBe('Updated Name');
      expect(component.successMessage).toContain('Sweet updated successfully!');
      expect(component.showEditModal).toBeFalsy();
    });

    it('should not edit if no sweet selected', () => {
      component.selectedSweet = null;

      component.editSweet();

      httpMock.expectNone("/.*\/api\/sweets\/\d+$/");
    });
  });

  describe('Delete Sweet', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'fake-token');
      component.sweets = [...mockSweets];
    });

    it('should delete sweet successfully', () => {
      const sweet = mockSweets[0];
      component.selectedSweet = sweet;

      component.deleteSweet();

      const req = httpMock.expectOne(`http://localhost:8000/api/sweets/${sweet.id}`);
      expect(req.request.method).toBe('DELETE');

      req.flush({ msg: 'Sweet deleted' });

      expect(component.sweets.find(s => s.id === sweet.id)).toBeUndefined();
      expect(component.successMessage).toContain('Sweet deleted successfully!');
      expect(component.showDeleteModal).toBeFalsy();
    });

    it('should handle delete error', () => {
      const sweet = mockSweets[0];
      component.selectedSweet = sweet;

      component.deleteSweet();

      const req = httpMock.expectOne(`http://localhost:8000/api/sweets/${sweet.id}`);
      req.flush({ detail: 'Delete failed' }, { status: 400, statusText: 'Bad Request' });

      expect(component.errorMessage).toContain('Delete failed');
    });
  });

  describe('Restock Sweet', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'fake-token');
      component.sweets = [...mockSweets];
    });

    it('should restock sweet successfully', () => {
      const sweet = mockSweets[0];
      component.selectedSweet = sweet;
      component.restockQuantity = 10;

      component.restockSweet();

      const req = httpMock.expectOne(`http://localhost:8000/api/sweets/${sweet.id}/restock`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ quantity: 10 });

      req.flush({ msg: 'Restocked', new_quantity: 20 });

      expect(component.sweets[0].quantity).toBe(20);
      expect(component.successMessage).toContain('Sweet restocked successfully!');
      expect(component.showRestockModal).toBeFalsy();
    });

    it('should validate restock quantity', () => {
      component.selectedSweet = mockSweets[0];
      component.restockQuantity = 0;

      component.restockSweet();

      expect(component.errorMessage).toBe('Please enter a valid quantity greater than 0.');
      httpMock.expectNone("/.*\/restock$/");
    });
  });

  describe('Form Validation', () => {
    it('should validate required name field', () => {
      component.sweetForm.name = '';

      expect(component.validateForm()).toBeFalsy();
      expect(component.errorMessage).toBe('Sweet name is required.');
    });

    it('should validate required category field', () => {
      component.sweetForm.name = 'Test';
      component.sweetForm.category = '';

      expect(component.validateForm()).toBeFalsy();
      expect(component.errorMessage).toBe('Category is required.');
    });

    it('should validate positive price', () => {
      component.sweetForm.name = 'Test';
      component.sweetForm.category = 'Cakes';
      component.sweetForm.price = 0;

      expect(component.validateForm()).toBeFalsy();
      expect(component.errorMessage).toBe('Price must be greater than 0.');
    });

    it('should validate non-negative quantity', () => {
      component.sweetForm.name = 'Test';
      component.sweetForm.category = 'Cakes';
      component.sweetForm.price = 100;
      component.sweetForm.quantity = -1;

      expect(component.validateForm()).toBeFalsy();
      expect(component.errorMessage).toBe('Quantity cannot be negative.');
    });

    it('should pass validation with valid form', () => {
      component.sweetForm = {
        name: 'Test Sweet',
        category: 'Cakes',
        price: 100,
        quantity: 5,
        description: 'Test description'
      };

      expect(component.validateForm()).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should logout and clear storage', () => {
      component.logout();

      expect(localStorage.clear).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should navigate to dashboard', () => {
      component.goToDashboard();

      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });


  describe('TrackBy Function', () => {
    it('should return sweet id for trackBy', () => {
      const sweet = mockSweets[0];
      const result = component.trackBySweet(0, sweet);
      expect(result).toBe(sweet.id);
    });
  });

  describe('Message Auto-Clear', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should auto-clear success and error messages after 3 seconds', () => {
      component.successMessage = 'Success!';
      component.errorMessage = 'Error!';

      component['clearMessages']();

      expect(component.successMessage).toBe('Success!');
      expect(component.errorMessage).toBe('Error!');

      jasmine.clock().tick(3001);

      expect(component.successMessage).toBe('');
      expect(component.errorMessage).toBe('');
    });
  });
});