import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn } from '@angular/common/http';
import { errorInterceptor } from './error-interceptor';

describe('errorInterceptor', () => {
  const interceptor: HttpInterceptorFn = (solicitud, siguiente) =>
    TestBed.runInInjectionContext(() => errorInterceptor(solicitud, siguiente));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('debería crearse', () => {
    expect(interceptor).toBeTruthy();
  });
});
