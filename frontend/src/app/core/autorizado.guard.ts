import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** As telas da loja só abrem num aparelho em que a proprietária já fez login. */
export const autorizadoGuard: CanActivateFn = () =>
  inject(AuthService).aparelhoAutorizado() ? true : inject(Router).parseUrl('/entrar');
