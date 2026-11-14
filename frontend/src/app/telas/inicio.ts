import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { reais } from '../core/regras';
import { VendaService } from '../core/venda.service';
import { Icone } from '../compartilhado/icone';
import { StatusSync } from '../compartilhado/status-sync';

/** Tela 1 - Início: menu principal com destaque para "Vender". */
@Component({
  selector: 'app-inicio',
  imports: [RouterLink, Icone, StatusSync],
  template: `
    <header class="topo">
      <div><h1><img class="logo" src="logo.svg" alt="Luziflor Modas" width="190" height="52"></h1><p class="sub">Controle da loja</p></div>
      <button class="botao-topo" type="button" (click)="sair()"><app-icone nome="sair" [tamanho]="22" />Sair</button>
    </header>
    <main class="conteudo">
      <app-status-sync />
      <a class="botao principal grande" routerLink="/vender">
        <app-icone nome="sacola" [tamanho]="40" /><span>Vender<small>Registrar uma venda agora</small></span>
      </a>
      <a class="botao" routerLink="/fiado">
        <app-icone nome="caderno" [tamanho]="34" /><span>Fiado<small>Quem me deve</small></span>
      </a>
      <a class="botao" routerLink="/estoque">
        <app-icone nome="caixa" [tamanho]="34" /><span>Estoque<small>Ver peças e tamanhos</small></span>
      </a>
      <section class="cartao" aria-labelledby="titulo-fiado">
        <h2 id="titulo-fiado" class="rotulo">Total a receber no fiado</h2>
        <p class="valor-grande">{{ reais(total()) }}</p>
        <p class="apagado">{{ textoClientes() }}</p>
      </section>
    </main>
  `,
})
export class Inicio implements OnInit {
  private readonly vendas = inject(VendaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly reais = reais;
  readonly total = signal(0);
  readonly quantidadeClientes = signal(0);

  async ngOnInit(): Promise<void> {
    const resumo = await this.vendas.resumoFiado();
    this.total.set(resumo.total);
    this.quantidadeClientes.set(resumo.clientes.length);
  }

  textoClientes(): string {
    const n = this.quantidadeClientes();
    if (n === 0) return 'Ninguém está devendo';
    return n === 1 ? '1 cliente com pagamento pendente' : `${n} clientes com pagamento pendente`;
  }

  async sair(): Promise<void> {
    await this.auth.sair();
    await this.router.navigateByUrl('/entrar');
  }
}
