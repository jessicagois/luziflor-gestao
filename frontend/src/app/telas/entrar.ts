import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { SyncService } from '../core/sync.service';

@Component({
  selector: 'app-entrar',
  template: `
    <header class="topo"><div><h1>Luziflor Modas</h1><p class="sub">Controle da loja</p></div></header>
    <main class="conteudo">
      <form class="cartao" (submit)="entrar($event)" novalidate>
        <h2>Entrar</h2>
        <label class="rotulo" for="senha">Senha</label>
        <input id="senha" class="campo" type="password" autocomplete="current-password" maxlength="200"
               [value]="senha()" (input)="senha.set($any($event.target).value)"
               [attr.aria-invalid]="!!erro()" aria-describedby="erro-senha">
        @if (erro()) {
          <p id="erro-senha" class="alerta erro" role="alert">{{ erro() }}</p>
        }
        <button class="botao principal" type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
    </main>
  `,
})
export class Entrar {
  private readonly auth = inject(AuthService);
  private readonly sync = inject(SyncService);
  private readonly router = inject(Router);

  readonly senha = signal('');
  readonly erro = signal<string | null>(null);
  readonly enviando = signal(false);

  async entrar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.senha()) { this.erro.set('Digite a senha.'); return; }
    this.enviando.set(true);
    const erro = await this.auth.entrar(this.senha());
    this.enviando.set(false);
    this.senha.set('');
    if (erro) { this.erro.set(erro); return; }
    this.sync.agendar(0);
    await this.router.navigateByUrl('/');
  }
}
