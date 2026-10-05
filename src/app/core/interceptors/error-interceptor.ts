import { HttpInterceptorFn } from '@angular/common/http';

/** Interceptor HTTP de errores; por ahora deja pasar la solicitud sin cambios. */
export const errorInterceptor: HttpInterceptorFn = (solicitud, siguiente) => {
  return siguiente(solicitud);
};
