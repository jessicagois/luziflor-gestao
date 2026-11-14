/**
 * Sessão da proprietária (RNF01).
 * - O token de acesso (30 min) fica só na memória.
 * - O token de renovação (7 dias) fica em cookie HttpOnly, que scripts não leem.
 * - O app abre sem internet num aparelho já autorizado; o login é exigido para sincronizar.
 */
import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

const CHAVE_APARELHO = 'luziflor_aparelho_autorizado';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly token = signal<string | null>(null);
  readonly aparelhoAutorizado = signal(this.lerAutorizacao());

  tokenAtual(): string | null {
    return this.token();
  }

  async entrar(senha: string): Promise<string | null> {
    try {
      const resposta = await fetch(`${environment.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ senha }),
      });
      if (resposta.status === 429) return 'Muitas tentativas. Espere 15 minutos e tente de novo.';
      if (!resposta.ok) return 'Usuário ou senha incorretos.';
      this.token.set((await resposta.json()).token_acesso);
      this.gravarAutorizacao(true);
      return null;
    } catch {
      return 'Sem internet. Conecte o celular para entrar pela primeira vez.';
    }
  }

  /** Pede um novo token de acesso usando o cookie de renovação. */
  async renovar(): Promise<boolean> {
    try {
      const resposta = await fetch(`${environment.apiUrl}/auth/renovar`, { method: 'POST', credentials: 'include' });
      if (!resposta.ok) return false;
      this.token.set((await resposta.json()).token_acesso);
      return true;
    } catch {
      return false;
    }
  }

  async sair(): Promise<void> {
    try {
      await fetch(`${environment.apiUrl}/auth/sair`, { method: 'POST', credentials: 'include' });
    } catch {
      // Sem internet: o token de renovação expira sozinho em até 7 dias.
    }
    this.token.set(null);
    this.gravarAutorizacao(false);
  }

  private lerAutorizacao(): boolean {
    try {
      return localStorage.getItem(CHAVE_APARELHO) === 'sim';
    } catch {
      return false;
    }
  }

  private gravarAutorizacao(valor: boolean): void {
    this.aparelhoAutorizado.set(valor);
    try {
      if (valor) localStorage.setItem(CHAVE_APARELHO, 'sim');
      else localStorage.removeItem(CHAVE_APARELHO);
    } catch {
      // Navegador sem armazenamento: segue só com a memória.
    }
  }
}
