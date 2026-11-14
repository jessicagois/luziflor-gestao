/**
 * Sincronização (offline-first): tudo é gravado primeiro no celular e
 * enviado ao servidor quando houver internet. Reenviar o mesmo registro
 * não duplica, porque o id (UUID) é criado no próprio aparelho.
 */
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ClienteRepositorio, ProdutoRepositorio, VendaRepositorio } from './repositorios';

export type EstadoSync = 'salvo' | 'pendente' | 'offline' | 'sincronizando' | 'sem-login';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly auth = inject(AuthService);
  private readonly produtos = inject(ProdutoRepositorio);
  private readonly clientes = inject(ClienteRepositorio);
  private readonly vendas = inject(VendaRepositorio);

  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly estado = signal<EstadoSync>('pendente');
  private emAndamento = false;
  private agendado?: ReturnType<typeof setTimeout>;

  iniciar(): void {
    window.addEventListener('online', () => { this.online.set(true); this.agendar(0); });
    window.addEventListener('offline', () => { this.online.set(false); this.estado.set('offline'); });
    setInterval(() => this.agendar(0), 60_000);
    this.agendar(0);
  }

  /** Pede uma sincronização em segundo plano, sem travar a tela. */
  agendar(atrasoMs = 1500): void {
    clearTimeout(this.agendado);
    this.agendado = setTimeout(() => void this.sincronizar(), atrasoMs);
  }

  async sincronizar(): Promise<void> {
    if (this.emAndamento) return;
    const total = await this.contarPendentes();
    if (!this.online()) { this.estado.set(total ? 'offline' : 'salvo'); return; }
    if (total === 0) { this.estado.set('salvo'); return; }
    if (!this.auth.tokenAtual() && !(await this.auth.renovar())) { this.estado.set('sem-login'); return; }

    this.emAndamento = true;
    this.estado.set('sincronizando');
    try {
      // Ordem importa: produtos e clientes antes das vendas que apontam para eles.
      for (const p of await this.produtos.pendentes()) {
        const { sincronizado, ...dados } = p;
        if (await this.enviar('/produtos', dados)) await this.produtos.marcarSincronizado(p.id_produto);
      }
      for (const c of await this.clientes.pendentes()) {
        const { sincronizado, ...dados } = c;
        if (await this.enviar('/clientes', dados)) await this.clientes.marcarSincronizado(c.id_cliente);
      }
      for (const v of await this.vendas.pendentes()) {
        const { sincronizado, ...dados } = v;
        if (await this.enviar('/vendas', dados)) await this.vendas.marcarSincronizado(v.id_venda);
      }
    } finally {
      this.emAndamento = false;
      this.estado.set((await this.contarPendentes()) ? 'pendente' : 'salvo');
    }
  }

  private async enviar(caminho: string, corpo: unknown, tentarRenovar = true): Promise<boolean> {
    try {
      const resposta = await fetch(`${environment.apiUrl}${caminho}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.auth.tokenAtual()}` },
        body: JSON.stringify(corpo),
      });
      if (resposta.status === 401 && tentarRenovar && (await this.auth.renovar())) {
        return this.enviar(caminho, corpo, false);
      }
      return resposta.ok;
    } catch {
      return false;
    }
  }

  private async contarPendentes(): Promise<number> {
    const [p, c, v] = await Promise.all([this.produtos.pendentes(), this.clientes.pendentes(), this.vendas.pendentes()]);
    return p.length + c.length + v.length;
  }
}
