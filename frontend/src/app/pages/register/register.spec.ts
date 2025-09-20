import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Register } from './register';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, Register, RouterTestingModule]
    });

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should call API on register', () => {
    component.username = 'testuser';
    component.email = 'test@example.com';
    component.password = 'test123';

    component.onRegister();

    const req = httpMock.expectOne('http://localhost:8000/api/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      username: 'testuser',
      email: 'test@example.com',
      password: 'test123',
      admin_code: null
    });

    req.flush({ msg: 'User registered' });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
