import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Dashboard } from './dashboard';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let httpMock: HttpTestingController;
  let router: Router;

  const mockSweets = [
    { id: 1, name: 'Chocolate Cake', category: 'Cakes', price: 500, quantity: 10 },
    { id: 2, name: 'Vanilla Cupcake', category: 'Cupcakes', price: 150, quantity: 0 },
    { id: 3, name: 'Strawberry Cookies', category: 'Cookies', price: 200, quantity: 5 }
  ];

  beforeEach(async () => {
    // Mock localStorage
    let store: { [key: string]: string } = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => store[key] = value);
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => delete store[key]);

    // Mock alert
    spyOn(window, 'alert');

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, Dashboard]
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
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

    it('should redirect to login if no token exists', () => {
      component.ngOnInit();
      expect(window.alert).toHaveBeenCalledWith('Please login first');
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should load sweets on init when token exists', () => {
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

      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should set loading state correctly', () => {
      expect(component.isLoading).toBeFalsy();

      component.loadSweets();
      expect(component.isLoading).toBeTruthy();

      const req = httpMock.expectOne('http://localhost:8000/api/sweets');
      req.flush(mockSweets);

      expect(component.isLoading).toBeFalsy();
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

    it('should search with only name parameter', () => {
      component.searchName = 'Cake';
      component.searchCategory = '';
      component.minPrice = null;
      component.maxPrice = null;

      component.onSearch();

      const req = httpMock.expectOne((request) =>
        request.url === 'http://localhost:8000/api/sweets/search' &&
        request.params.get('name') === 'Cake' &&
        !request.params.has('category') &&
        !request.params.has('min_price') &&
        !request.params.has('max_price')
      );

      req.flush([mockSweets[0]]);
      expect(component.sweets).toEqual([mockSweets[0]]);
    });

    it('should handle search error', () => {
      component.searchName = 'Test';
      component.onSearch();

      const req = httpMock.expectOne((request) =>
        request.url === 'http://localhost:8000/api/sweets/search' &&
        request.params.get('name') === 'Test'
      );
      req.flush({ detail: 'Search failed' }, { status: 400, statusText: 'Bad Request' });

      expect(component.errorMessage).toContain('Search failed');
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

  describe('Purchase Sweet', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'fake-token');
      component.sweets = JSON.parse(JSON.stringify(mockSweets)); // Deep copy
    });

    it('should purchase sweet successfully', () => {
      const sweet = component.sweets[0];

      component.purchaseSweet(sweet);

      expect(component.purchasingId).toBe(sweet.id);

      const req = httpMock.expectOne(`http://localhost:8000/api/sweets/${sweet.id}/purchase`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ quantity: 1 });

      req.flush({ remaining_quantity: 9 });

      expect(component.successMessage).toContain('Successfully purchased');
      expect(component.purchasingId).toBeNull();
      expect(sweet.quantity).toBe(9);
    });

    it('should not purchase when out of stock', () => {
      const outOfStockSweet = component.sweets[1]; // quantity: 0

      component.purchaseSweet(outOfStockSweet);

      httpMock.expectNone(`http://localhost:8000/api/sweets/${outOfStockSweet.id}/purchase`);
      expect(component.purchasingId).toBeNull();
    });

    it('should not purchase when already purchasing', () => {
      const sweet = component.sweets[0];
      component.purchasingId = sweet.id;

      component.purchaseSweet(sweet);

      httpMock.expectNone(`http://localhost:8000/api/sweets/${sweet.id}/purchase`);
      expect(component.purchasingId).toBe(sweet.id);
    });

    it('should handle 401 error during purchase', () => {
      const sweet = component.sweets[0];

      component.purchaseSweet(sweet);

      const req = httpMock.expectOne(`http://localhost:8000/api/sweets/${sweet.id}/purchase`);
      req.flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Logout Functionality', () => {
    it('should logout and redirect to login', () => {
      localStorage.setItem('token', 'fake-token');
      localStorage.setItem('token_type', 'bearer');

      component.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('token_type');
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Error Message Handling', () => {
    it('should handle network error (status 0)', () => {
      const error = { status: 0, error: null } as any;
      const message = component['getErrorMsg'](error, 'Fallback');

      expect(message).toContain('Unable to connect to server');
    });

    it('should handle error with string detail', () => {
      const error = { status: 400, error: { detail: 'Custom error' } } as any;
      const message = component['getErrorMsg'](error, 'Fallback');

      expect(message).toBe('Custom error');
    });

    it('should handle error with string error', () => {
      const error = { status: 400, error: 'String error' } as any;
      const message = component['getErrorMsg'](error, 'Fallback');

      expect(message).toBe('String error');
    });

    it('should use fallback message when no specific error', () => {
      const error = { status: 500, error: null } as any;
      const message = component['getErrorMsg'](error, 'Fallback message');

      expect(message).toContain('Fallback message');
      expect(message).toContain('500');
    });
  });

  describe('Success Message Auto-Clear', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'fake-token');
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should auto-clear success message after 3 seconds', () => {
      component.sweets = JSON.parse(JSON.stringify(mockSweets));
      const sweet = component.sweets[0];

      component.purchaseSweet(sweet);

      const req = httpMock.expectOne(`http://localhost:8000/api/sweets/${sweet.id}/purchase`);
      req.flush({ remaining_quantity: 9 });

      expect(component.successMessage).toBeTruthy();

      jasmine.clock().tick(3001);

      expect(component.successMessage).toBe('');
    });
  });
});