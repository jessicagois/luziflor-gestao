import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Cliente, FormaPagamento, NOMES_PAGAMENTO, Produto } from '../core/modelos';
import { calcularTotal, reais } from '../core/regras';
import { EstoqueService } from '../core/estoque.service';
import { VendaService } from '../core/venda.service';
import { Icone, NomeIcone } from '../compartilhado/icone';

interface GrupoPeca { nome: string; precoVenda: number; tamanhos: Produto[]; }

/** Tela 2 - Vender: registra a venda (RF04) e o fiado com cliente (RF05). */
@Component({
  selector: 'app-vender',
  imports: [RouterLink, Icone],
  template: `
    <header class="topo">
      <a class="botao-topo" routerLink="/"><app-icone nome="voltar" [tamanho]="22" />Voltar</a>
      <h1 class="titulo-centro">Vender</h1>
    </header>
    <main class="conteudo">
      <div>
        <label class="rotulo" for="busca">Qual peça?</label>
        <div class="campo-com-icone">
          <app-icone nome="busca" [tamanho]="24" />
          <input id="busca" class="campo" type="search" maxlength="100" autocomplete="off"
                 placeholder="Digite parte do nome" [value]="busca()" (input)="buscar($any($event.target).value)">
        </div>
      </div>

      @for (grupo of grupos(); track grupo.nome) {
        <button type="button" class="cartao selecionavel" [class.marcado]="grupo.nome === pecaEscolhida()"
                [attr.aria-pressed]="grupo.nome === pecaEscolhida()" (click)="escolherPeca(grupo.nome)">
          <span class="linha"><b>{{ grupo.nome }}</b><b>{{ reais(grupo.precoVenda) }}</b></span>
          <span class="apagado">No estoque: {{ resumoEstoque(grupo) }}</span>
        </button>
      } @empty {
        @if (busca()) { <p class="apagado">Nenhuma peça encontrada com "{{ busca() }}".</p> }
      }
      @if (erroCampo() === 'peca') { <p class="alerta erro" role="alert"><app-icone nome="atencao" [tamanho]="24" />{{ erro() }}</p> }

      @if (grupoEscolhido(); as grupo) {
        <fieldset>
          <legend class="rotulo">Tamanho</legend>
          <div class="linha-opcoes">
            @for (p of grupo.tamanhos; track p.id_produto) {
              <button type="button" class="opcao" [class.marcado]="p.id_produto === idProduto()"
                      [class.desligado]="p.quantidade_estoque === 0" [disabled]="p.quantidade_estoque === 0"
                      [attr.aria-pressed]="p.id_produto === idProduto()" (click)="escolherTamanho(p)">
                @if (p.id_produto === idProduto()) { <app-icone nome="certo" [tamanho]="22" /> }
                {{ p.tamanho }}
                @if (p.quantidade_estoque === 0) { <small>sem estoque</small> }
              </button>
            }
          </div>
        </fieldset>
      }

      @if (produto(); as p) {
        <div>
          <span class="rotulo" id="rotulo-qtd">Quantidade</span>
          <div class="quantidade" role="group" aria-labelledby="rotulo-qtd">
            <button type="button" class="botao-qtd" aria-label="Diminuir quantidade" (click)="mudarQuantidade(-1)"><app-icone nome="menos" /></button>
            <output class="numero" aria-live="polite">{{ quantidade() }}</output>
            <button type="button" class="botao-qtd" aria-label="Aumentar quantidade" (click)="mudarQuantidade(1)"><app-icone nome="mais" /></button>
            <span class="apagado">de {{ p.quantidade_estoque }} disponíveis</span>
          </div>
          @if (erroCampo() === 'quantidade') { <p class="alerta erro" role="alert"><app-icone nome="atencao" [tamanho]="24" />{{ erro() }}</p> }
        </div>
      }

      <fieldset>
        <legend class="rotulo">Como vai pagar?</legend>
        <div class="grade-opcoes">
          @for (f of formas; track f.valor) {
            <button type="button" class="opcao" [class.marcado]="forma() === f.valor" [attr.aria-pressed]="forma() === f.valor"
                    (click)="escolherForma(f.valor)">
              <app-icone [nome]="forma() === f.valor ? 'certo' : f.icone" [tamanho]="22" />{{ f.nome }}
            </button>
          }
        </div>
        @if (erroCampo() === 'pagamento') { <p class="alerta erro" role="alert"><app-icone nome="atencao" [tamanho]="24" />{{ erro() }}</p> }
      </fieldset>

      @if (forma() === 'fiado') {
        <div>
          <label class="rotulo" for="cliente">Cliente</label>
          <select id="cliente" class="campo" [value]="idCliente() ?? ''" (change)="escolherCliente($any($event.target).value)"
                  [attr.aria-invalid]="erroCampo() === 'cliente'">
            <option value="">Escolha o cliente</option>
            @for (c of clientes(); track c.id_cliente) { <option [value]="c.id_cliente">{{ c.nome }}</option> }
          </select>
          @if (erroCampo() === 'cliente') { <p class="alerta erro" role="alert"><app-icone nome="atencao" [tamanho]="24" />{{ erro() }}</p> }

          @if (!novoCliente()) {
            <button type="button" class="botao centro medio" (click)="novoCliente.set(true)"><app-icone nome="mais" [tamanho]="24" />Novo cliente</button>
          } @else {
            <div class="cartao">
              <label class="rotulo" for="nome-cliente">Nome do cliente</label>
              <input id="nome-cliente" class="campo" maxlength="100" [value]="nomeNovo()" (input)="nomeNovo.set($any($event.target).value)">
              <label class="rotulo" for="tel-cliente">Telefone (opcional)</label>
              <input id="tel-cliente" class="campo" type="tel" inputmode="tel" maxlength="20" [value]="telNovo()" (input)="telNovo.set($any($event.target).value)">
              @if (erroCliente()) { <p class="alerta erro" role="alert"><app-icone nome="atencao" [tamanho]="24" />{{ erroCliente() }}</p> }
              <button type="button" class="botao centro medio" (click)="salvarCliente()"><app-icone nome="certo" [tamanho]="24" />Salvar cliente</button>
            </div>
          }
        </div>
      }

      <p class="total"><span>Total</span><span class="valor-grande">{{ reais(total()) }}</span></p>
      <button type="button" class="botao principal centro" [disabled]="salvando()" (click)="confirmar()">
        <app-icone nome="certo" [tamanho]="30" />{{ salvando() ? 'Salvando...' : 'Confirmar venda' }}
      </button>
    </main>
  `,
})
export class Vender implements OnInit {
  private readonly estoque = inject(EstoqueService);
  private readonly vendas = inject(VendaService);
  private readonly router = inject(Router);

  readonly reais = reais;
  readonly formas: { valor: FormaPagamento; nome: string; icone: NomeIcone }[] = [
    { valor: 'dinheiro', nome: NOMES_PAGAMENTO.dinheiro, icone: 'dinheiro' },
    { valor: 'pix', nome: NOMES_PAGAMENTO.pix, icone: 'pix' },
    { valor: 'cartao', nome: NOMES_PAGAMENTO.cartao, icone: 'cartao' },
    { valor: 'fiado', nome: NOMES_PAGAMENTO.fiado, icone: 'caderno' },
  ];

  readonly busca = signal('');
  readonly encontrados = signal<Produto[]>([]);
  readonly pecaEscolhida = signal<string | null>(null);
  readonly produto = signal<Produto | null>(null);
  readonly quantidade = signal(1);
  readonly forma = signal<FormaPagamento | null>(null);
  readonly clientes = signal<Cliente[]>([]);
  readonly idCliente = signal<string | null>(null);
  readonly novoCliente = signal(false);
  readonly nomeNovo = signal('');
  readonly telNovo = signal('');
  readonly erroCliente = signal<string | null>(null);
  readonly erro = signal<string | null>(null);
  readonly erroCampo = signal<string | null>(null);
  readonly salvando = signal(false);

  readonly idProduto = computed(() => this.produto()?.id_produto ?? null);

  readonly grupos = computed<GrupoPeca[]>(() => {
    const mapa = new Map<string, GrupoPeca>();
    for (const p of this.encontrados()) {
      const grupo = mapa.get(p.nome) ?? { nome: p.nome, precoVenda: p.preco_venda, tamanhos: [] };
      grupo.tamanhos.push(p);
      mapa.set(p.nome, grupo);
    }
    return [...mapa.values()].slice(0, 30);
  });

  readonly grupoEscolhido = computed(() => this.grupos().find((g) => g.nome === this.pecaEscolhida()) ?? null);

  readonly total = computed(() => {
    const p = this.produto();
    return p ? calcularTotal([{ quantidade: this.quantidade(), preco_unitario: p.preco_venda }]) : 0;
  });

  async ngOnInit(): Promise<void> {
    this.clientes.set(await this.vendas.listarClientes());
  }

  async buscar(texto: string): Promise<void> {
    this.busca.set(texto);
    this.encontrados.set(texto.trim() ? await this.estoque.buscar(texto) : []);
  }

  escolherPeca(nome: string): void {
    this.pecaEscolhida.set(nome);
    this.produto.set(null);
    this.limparErro();
  }

  escolherTamanho(p: Produto): void {
    this.produto.set(p);
    this.quantidade.set(1);
    this.limparErro();
  }

  mudarQuantidade(delta: number): void {
    const max = this.produto()?.quantidade_estoque ?? 1;
    this.quantidade.set(Math.min(Math.max(1, this.quantidade() + delta), Math.max(1, max)));
  }

  escolherForma(f: FormaPagamento): void {
    this.forma.set(f);
    if (f !== 'fiado') this.idCliente.set(null);
    this.limparErro();
  }

  escolherCliente(id: string): void {
    this.idCliente.set(id || null);
    this.limparErro();
  }

  async salvarCliente(): Promise<void> {
    const { cliente, erro } = await this.vendas.cadastrarCliente(this.nomeNovo(), this.telNovo());
    if (erro || !cliente) { this.erroCliente.set(erro ?? 'Não foi possível salvar.'); return; }
    this.clientes.set(await this.vendas.listarClientes());
    this.idCliente.set(cliente.id_cliente);
    this.novoCliente.set(false);
    this.nomeNovo.set('');
    this.telNovo.set('');
    this.erroCliente.set(null);
  }

  async confirmar(): Promise<void> {
    const p = this.produto();
    if (!p) { this.mostrarErro('Escolha a peça e o tamanho.', 'peca'); return; }
    this.salvando.set(true);
    const resultado = await this.vendas.registrar({
      idProduto: p.id_produto, quantidade: this.quantidade(), forma: this.forma(), idCliente: this.idCliente(),
    });
    this.salvando.set(false);
    if (resultado.ok) {
      await this.router.navigate(['/resultado', resultado.idVenda]);
    } else {
      this.mostrarErro(resultado.erro, resultado.campo);
    }
  }

  resumoEstoque(grupo: GrupoPeca): string {
    return grupo.tamanhos.map((t) => `${t.tamanho} ${t.quantidade_estoque}`).join(' · ');
  }

  private mostrarErro(mensagem: string, campo: string): void {
    this.erro.set(mensagem);
    this.erroCampo.set(campo);
  }

  private limparErro(): void {
    this.erro.set(null);
    this.erroCampo.set(null);
  }
}
