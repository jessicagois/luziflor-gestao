import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Categoria, Produto } from '../core/modelos';
import { estoqueBaixo, lerValor, reais } from '../core/regras';
import { EstoqueService } from '../core/estoque.service';
import { Icone } from '../compartilhado/icone';

/** Estoque: consulta (RF03), cadastro de peça (RF01) e entrada de mercadoria (RF02). */
@Component({
  selector: 'app-estoque',
  imports: [RouterLink, Icone],
  template: `
    <header class="topo">
      <a class="botao-topo" routerLink="/"><app-icone nome="voltar" [tamanho]="22" />Voltar</a>
      <h1 class="titulo-centro">Estoque</h1>
    </header>
    <main class="conteudo">
      @if (mensagem()) { <p class="alerta sucesso" role="status"><app-icone nome="certo" [tamanho]="28" />{{ mensagem() }}</p> }

      @if (!cadastrando()) {
        <button type="button" class="botao principal centro" (click)="abrirCadastro()"><app-icone nome="mais" [tamanho]="28" />Nova peça</button>
      } @else {
        <form class="cartao" (submit)="cadastrar($event)" novalidate aria-labelledby="titulo-nova">
          <h2 id="titulo-nova">Nova peça</h2>
          <label class="rotulo" for="nome">Nome da peça</label>
          <input id="nome" class="campo" maxlength="100" [value]="nome()" (input)="nome.set($any($event.target).value)">
          <label class="rotulo" for="categoria">Para quem</label>
          <select id="categoria" class="campo" [value]="categoria()" (change)="categoria.set($any($event.target).value)">
            <option value="feminino">Feminino</option><option value="masculino">Masculino</option><option value="infantil">Infantil</option>
          </select>
          <label class="rotulo" for="tamanho">Tamanho</label>
          <input id="tamanho" class="campo" maxlength="20" [value]="tamanho()" (input)="tamanho.set($any($event.target).value)">
          <label class="rotulo" for="custo">Quanto pagou (custo)</label>
          <input id="custo" class="campo" inputmode="decimal" placeholder="Ex.: 25,00" [value]="custo()" (input)="custo.set($any($event.target).value)">
          <label class="rotulo" for="preco">Preço de venda</label>
          <input id="preco" class="campo" inputmode="decimal" placeholder="Ex.: 45,00" [value]="preco()" (input)="preco.set($any($event.target).value)">
          <label class="rotulo" for="qtd">Quantas peças</label>
          <input id="qtd" class="campo" type="number" inputmode="numeric" min="0" [value]="qtd()" (input)="qtd.set($any($event.target).value)">
          @for (e of erros(); track e) { <p class="alerta erro" role="alert"><app-icone nome="atencao" [tamanho]="24" />{{ e }}</p> }
          <div class="linha-opcoes">
            <button type="submit" class="botao principal centro medio">Salvar peça</button>
            <button type="button" class="botao centro medio" (click)="cadastrando.set(false)">Cancelar</button>
          </div>
        </form>
      }

      <div>
        <label class="rotulo" for="busca-estoque">Procurar peça</label>
        <div class="campo-com-icone">
          <app-icone nome="busca" [tamanho]="24" />
          <input id="busca-estoque" class="campo" type="search" maxlength="100" [value]="busca()" (input)="buscar($any($event.target).value)">
        </div>
      </div>

      <ul class="lista">
        @for (p of visiveis(); track p.id_produto) {
          <li class="cartao">
            <div class="linha"><b>{{ p.nome }} · {{ p.tamanho }}</b><span>{{ reais(p.preco_venda) }}</span></div>
            <div class="linha">
              <span>No estoque: <b>{{ p.quantidade_estoque }}</b></span>
              @if (estoqueBaixo(p.quantidade_estoque)) { <span class="chip pendente"><app-icone nome="atencao" [tamanho]="20" />Pouco</span> }
            </div>
            @if (entradaDe() === p.id_produto) {
              <label class="rotulo" [for]="'entrada-' + p.id_produto">Quantas peças chegaram?</label>
              <input [id]="'entrada-' + p.id_produto" class="campo" type="number" inputmode="numeric" min="1"
                     [value]="qtdEntrada()" (input)="qtdEntrada.set($any($event.target).value)">
              @if (erroEntrada()) { <p class="alerta erro" role="alert"><app-icone nome="atencao" [tamanho]="24" />{{ erroEntrada() }}</p> }
              <div class="linha-opcoes">
                <button type="button" class="botao principal centro medio" (click)="salvarEntrada(p.id_produto)">Somar ao estoque</button>
                <button type="button" class="botao centro medio" (click)="entradaDe.set(null)">Cancelar</button>
              </div>
            } @else {
              <button type="button" class="botao centro medio" (click)="abrirEntrada(p.id_produto)"><app-icone nome="mais" [tamanho]="24" />Entrada</button>
            }
          </li>
        } @empty {
          <li class="apagado">Nenhuma peça encontrada.</li>
        }
      </ul>
      @if (produtos().length > visiveis().length) {
        <button type="button" class="botao centro medio" (click)="limite.set(limite() + 30)">Mostrar mais</button>
      }
    </main>
  `,
})
export class Estoque implements OnInit {
  private readonly estoque = inject(EstoqueService);

  readonly reais = reais;
  readonly estoqueBaixo = estoqueBaixo;
  readonly produtos = signal<Produto[]>([]);
  readonly limite = signal(30);
  readonly busca = signal('');
  readonly mensagem = signal<string | null>(null);

  readonly cadastrando = signal(false);
  readonly nome = signal('');
  readonly categoria = signal<Categoria>('feminino');
  readonly tamanho = signal('');
  readonly custo = signal('');
  readonly preco = signal('');
  readonly qtd = signal('1');
  readonly erros = signal<string[]>([]);

  readonly entradaDe = signal<string | null>(null);
  readonly qtdEntrada = signal('1');
  readonly erroEntrada = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.buscar('');
  }

  visiveis(): Produto[] {
    return this.produtos().slice(0, this.limite());
  }

  async buscar(texto: string): Promise<void> {
    this.busca.set(texto);
    this.produtos.set(await this.estoque.buscar(texto));
  }

  abrirCadastro(): void {
    this.cadastrando.set(true);
    this.mensagem.set(null);
    this.erros.set([]);
  }

  async cadastrar(evento: Event): Promise<void> {
    evento.preventDefault();
    const erros = await this.estoque.cadastrar({
      nome: this.nome(), categoria: this.categoria(), tamanho: this.tamanho(),
      preco_custo: lerValor(this.custo()), preco_venda: lerValor(this.preco()), quantidade: Number(this.qtd()),
    });
    this.erros.set(erros);
    if (erros.length) return;
    this.mensagem.set(`${this.nome().trim()} ${this.tamanho().trim().toUpperCase()} cadastrada.`);
    this.cadastrando.set(false);
    this.nome.set(''); this.tamanho.set(''); this.custo.set(''); this.preco.set(''); this.qtd.set('1');
    await this.buscar(this.busca());
  }

  abrirEntrada(id: string): void {
    this.entradaDe.set(id);
    this.qtdEntrada.set('1');
    this.erroEntrada.set(null);
  }

  async salvarEntrada(id: string): Promise<void> {
    const erro = await this.estoque.registrarEntrada(id, Number(this.qtdEntrada()));
    if (erro) { this.erroEntrada.set(erro); return; }
    this.entradaDe.set(null);
    this.mensagem.set('Entrada registrada.');
    await this.buscar(this.busca());
  }
}
