import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cliente, NOMES_PAGAMENTO, Produto, Venda } from '../core/modelos';
import { estoqueBaixo, reais } from '../core/regras';
import { ClienteRepositorio, ProdutoRepositorio } from '../core/repositorios';
import { VendaService } from '../core/venda.service';
import { Icone } from '../compartilhado/icone';

/** Tela 3 - Resultado: confirmação, novo estoque, situação do fiado (RF06/RF07) e alertas. */
@Component({
  selector: 'app-resultado',
  imports: [RouterLink, Icone],
  template: `
    <header class="topo"><h1>Resultado</h1></header>
    <main class="conteudo">
      @if (venda(); as v) {
        <p class="alerta sucesso" role="status"><app-icone nome="certo" [tamanho]="36" />Venda registrada</p>

        <section class="cartao" aria-labelledby="titulo-resumo">
          <h2 id="titulo-resumo" class="rotulo">Resumo da venda</h2>
          <dl>
            <div class="linha"><dt>Peça</dt><dd>{{ produto()?.nome }} · {{ produto()?.tamanho }}</dd></div>
            <div class="linha"><dt>Quantidade</dt><dd>{{ v.itens[0].quantidade }}</dd></div>
            <div class="linha"><dt>Pagamento</dt><dd>{{ nomesPagamento[v.forma_pagamento] }}</dd></div>
            <div class="linha"><dt>Valor</dt><dd>{{ reais(v.valor_total) }}</dd></div>
            <div class="linha separada"><dt>Estoque agora</dt><dd>{{ produto()?.quantidade_estoque }} {{ produto()?.nome }} {{ produto()?.tamanho }}</dd></div>
          </dl>
        </section>

        @if (cliente(); as c) {
          <section class="cartao" aria-labelledby="titulo-cliente">
            <div class="linha">
              <h2 id="titulo-cliente" class="nome-cliente"><app-icone nome="pessoa" [tamanho]="24" />{{ c.nome }}</h2>
              @if (v.status_pagamento === 'pendente') {
                <span class="chip pendente"><app-icone nome="relogio" [tamanho]="22" />Pendente</span>
              } @else {
                <span class="chip ok"><app-icone nome="certo" [tamanho]="22" />Pago</span>
              }
            </div>
            <div class="linha"><span>Deve no total</span><b class="valor-medio">{{ reais(saldo()) }}</b></div>

            @if (v.status_pagamento === 'pendente') {
              @if (!confirmando()) {
                <button type="button" class="botao centro medio" (click)="confirmando.set(true)">
                  <app-icone nome="certo" [tamanho]="26" />Marcar como pago
                </button>
              } @else {
                <div class="confirmacao" role="alertdialog" aria-labelledby="pergunta">
                  <p id="pergunta"><b>Confirmar que {{ c.nome }} pagou {{ reais(v.valor_total) }}?</b></p>
                  <div class="linha-opcoes">
                    <button type="button" class="botao principal centro medio" (click)="quitar()">Sim, recebi</button>
                    <button type="button" class="botao centro medio" (click)="confirmando.set(false)">Cancelar</button>
                  </div>
                </div>
              }
            }
          </section>
        }

        @if (produto(); as p) {
          @if (estoqueBaixo(p.quantidade_estoque)) {
            <p class="alerta atencao" role="alert">
              <app-icone nome="atencao" [tamanho]="30" />
              <span><b>Atenção:</b> {{ p.quantidade_estoque === 0 ? 'acabou ' + p.nome + ' ' + p.tamanho + '.' : 'restam só ' + p.quantidade_estoque + ' ' + p.nome + ' ' + p.tamanho + ' no estoque.' }} Pense em repor.</span>
            </p>
          }
        }

        <a class="botao centro medio" routerLink="/vender"><app-icone nome="sacola" [tamanho]="26" />Nova venda</a>
        <a class="botao centro medio" routerLink="/"><app-icone nome="casa" [tamanho]="26" />Voltar ao início</a>
      } @else {
        <p class="alerta atencao" role="alert"><app-icone nome="atencao" [tamanho]="30" />Venda não encontrada.</p>
        <a class="botao centro medio" routerLink="/"><app-icone nome="casa" [tamanho]="26" />Voltar ao início</a>
      }
    </main>
  `,
})
export class Resultado implements OnInit {
  /** Id da venda, vindo da rota /resultado/:id */
  readonly id = input.required<string>();

  private readonly vendas = inject(VendaService);
  private readonly produtos = inject(ProdutoRepositorio);
  private readonly clientes = inject(ClienteRepositorio);

  readonly reais = reais;
  readonly estoqueBaixo = estoqueBaixo;
  readonly nomesPagamento = NOMES_PAGAMENTO;
  readonly venda = signal<Venda | null>(null);
  readonly produto = signal<Produto | null>(null);
  readonly cliente = signal<Cliente | null>(null);
  readonly saldo = signal(0);
  readonly confirmando = signal(false);

  async ngOnInit(): Promise<void> {
    await this.carregar();
  }

  async quitar(): Promise<void> {
    await this.vendas.quitar(this.id());
    this.confirmando.set(false);
    await this.carregar();
  }

  private async carregar(): Promise<void> {
    const venda = (await this.vendas.obterVenda(this.id())) ?? null;
    this.venda.set(venda);
    if (!venda) return;
    this.produto.set((await this.produtos.obter(venda.itens[0].id_produto)) ?? null);
    if (venda.id_cliente) {
      this.cliente.set((await this.clientes.obter(venda.id_cliente)) ?? null);
      this.saldo.set(await this.vendas.saldoDoCliente(venda.id_cliente));
    }
  }
}
