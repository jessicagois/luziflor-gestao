import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { reais } from '../core/regras';
import { SaldoCliente, VendaService } from '../core/venda.service';
import { Icone } from '../compartilhado/icone';

/** Fiado: quem deve, quanto deve e desde quando (RF06), com quitação (RF07). */
@Component({
  selector: 'app-fiado',
  imports: [RouterLink, Icone],
  template: `
    <header class="topo">
      <a class="botao-topo" routerLink="/"><app-icone nome="voltar" [tamanho]="22" />Voltar</a>
      <h1 class="titulo-centro">Quem me deve</h1>
    </header>
    <main class="conteudo">
      <section class="cartao">
        <h2 class="rotulo">Total a receber no fiado</h2>
        <p class="valor-grande">{{ reais(total()) }}</p>
      </section>

      @for (item of clientes(); track item.cliente.id_cliente) {
        <section class="cartao" [attr.aria-label]="item.cliente.nome">
          <div class="linha">
            <h2 class="nome-cliente"><app-icone nome="pessoa" [tamanho]="24" />{{ item.cliente.nome }}</h2>
            <span class="chip pendente"><app-icone nome="relogio" [tamanho]="22" />Pendente</span>
          </div>
          <div class="linha"><span>Deve no total</span><b class="valor-medio">{{ reais(item.saldo) }}</b></div>
          <ul class="lista">
            @for (v of item.vendas; track v.id_venda) {
              <li class="linha">
                <span>{{ data(v.data_venda) }} · {{ reais(v.valor_total) }}</span>
                @if (confirmando() === v.id_venda) {
                  <span class="linha-opcoes">
                    <button type="button" class="botao principal centro pequeno" (click)="quitar(v.id_venda)">Sim, recebi</button>
                    <button type="button" class="botao centro pequeno" (click)="confirmando.set(null)">Cancelar</button>
                  </span>
                } @else {
                  <button type="button" class="botao centro pequeno" (click)="confirmando.set(v.id_venda)"
                          [attr.aria-label]="'Marcar como pago: ' + reais(v.valor_total) + ' de ' + data(v.data_venda)">
                    <app-icone nome="certo" [tamanho]="22" />Pago
                  </button>
                }
              </li>
            }
          </ul>
        </section>
      } @empty {
        <p class="alerta sucesso" role="status"><app-icone nome="certo" [tamanho]="30" />Ninguém está devendo.</p>
      }
    </main>
  `,
})
export class Fiado implements OnInit {
  private readonly vendas = inject(VendaService);

  readonly reais = reais;
  readonly clientes = signal<SaldoCliente[]>([]);
  readonly total = signal(0);
  readonly confirmando = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.carregar();
  }

  async quitar(idVenda: string): Promise<void> {
    await this.vendas.quitar(idVenda);
    this.confirmando.set(null);
    await this.carregar();
  }

  data(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  private async carregar(): Promise<void> {
    const resumo = await this.vendas.resumoFiado();
    this.clientes.set(resumo.clientes);
    this.total.set(resumo.total);
  }
}
