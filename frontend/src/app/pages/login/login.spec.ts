import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Login } from './login';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule, Login]
    });

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should call API on login', () => {
    component.email = 'testuser@example.com';
    component.password = 'test123';

    component.onLogin();

    const req = httpMock.expectOne('http://localhost:8000/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'testuser@example.com',
      password: 'test123'
    });

    req.flush({ access_token: 'fake-jwt', token_type: 'bearer' });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
