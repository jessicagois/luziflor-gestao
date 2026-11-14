import { Routes } from '@angular/router';
import { autorizadoGuard } from './core/autorizado.guard';

// Telas carregadas sob demanda (lazy loading) para abrir mais rápido no celular.
export const routes: Routes = [
  { path: 'entrar', title: 'Entrar - Luziflor', loadComponent: () => import('./telas/entrar').then((m) => m.Entrar) },
  {
    path: '',
    canActivate: [autorizadoGuard],
    children: [
      { path: '', title: 'Início - Luziflor', loadComponent: () => import('./telas/inicio').then((m) => m.Inicio) },
      { path: 'vender', title: 'Vender - Luziflor', loadComponent: () => import('./telas/vender').then((m) => m.Vender) },
      { path: 'resultado/:id', title: 'Resultado - Luziflor', loadComponent: () => import('./telas/resultado').then((m) => m.Resultado) },
      { path: 'fiado', title: 'Fiado - Luziflor', loadComponent: () => import('./telas/fiado').then((m) => m.Fiado) },
      { path: 'estoque', title: 'Estoque - Luziflor', loadComponent: () => import('./telas/estoque').then((m) => m.Estoque) },
    ],
  },
  { path: '**', redirectTo: '' },
];
