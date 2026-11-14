import { Component, computed, inject } from '@angular/core';
import { SyncService } from '../core/sync.service';
import { Icone } from './icone';

/** Indicador de sincronização: texto + ícone + cor (não depende só da cor). */
@Component({
  selector: 'app-status-sync',
  imports: [Icone],
  template: `
    <p class="chip" [class.ok]="info().ok" [class.aviso]="!info().ok" role="status" aria-live="polite">
      <app-icone [nome]="info().icone" [tamanho]="24" />{{ info().texto }}
    </p>
  `,
})
export class StatusSync {
  private readonly sync = inject(SyncService);

  readonly info = computed(() => {
    switch (this.sync.estado()) {
      case 'salvo': return { ok: true, icone: 'nuvem' as const, texto: 'Tudo salvo' };
      case 'sincronizando': return { ok: true, icone: 'nuvem' as const, texto: 'Salvando na nuvem...' };
      case 'offline': return { ok: false, icone: 'nuvem-off' as const, texto: 'Sem internet: salvando no celular' };
      case 'sem-login': return { ok: false, icone: 'nuvem-off' as const, texto: 'Salvo no celular. Entre de novo para enviar' };
      default: return { ok: false, icone: 'nuvem' as const, texto: 'Salvo no celular, enviando depois' };
    }
  });
}
