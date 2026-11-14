/** Regras de venda (RF04), fiado (RF05) e quitação (RF07). */
import { Injectable, inject } from '@angular/core';
import { BancoService } from './banco';
import { Cliente, FormaPagamento, Venda } from './modelos';
import { calcularTotal, saldoDevedor, statusInicial, validarCliente, validarNomeCliente, validarQuantidade } from './regras';
import { ClienteRepositorio, VendaRepositorio } from './repositorios';
import { SyncService } from './sync.service';

export interface PedidoVenda {
  idProduto: string;
  quantidade: number;
  forma: FormaPagamento | null;
  idCliente: string | null;
}

export type ResultadoVenda = { ok: true; idVenda: string } | { ok: false; erro: string; campo: 'peca' | 'quantidade' | 'pagamento' | 'cliente' };

export interface SaldoCliente {
  cliente: Cliente;
  saldo: number;
  vendas: Venda[];
}

@Injectable({ providedIn: 'root' })
export class VendaService {
  private readonly db = inject(BancoService).db;
  private readonly clientes = inject(ClienteRepositorio);
  private readonly vendas = inject(VendaRepositorio);
  private readonly sync = inject(SyncService);

  /**
   * Grava a venda, os itens e a baixa no estoque em UMA transação:
   * se qualquer parte falhar, nada é gravado.
   */
  async registrar(pedido: PedidoVenda): Promise<ResultadoVenda> {
    const erroPagamento = validarCliente(pedido.forma, pedido.idCliente);
    if (erroPagamento) return { ok: false, erro: erroPagamento, campo: pedido.forma ? 'cliente' : 'pagamento' };

    try {
      const idVenda = await this.db.transaction('rw', this.db.produtos, this.db.vendas, this.db.clientes, async () => {
        const produto = await this.db.produtos.get(pedido.idProduto);
        if (!produto || !produto.ativo) throw new ErroVenda('Escolha a peça e o tamanho.', 'peca');
        const erroQtd = validarQuantidade(pedido.quantidade, produto.quantidade_estoque);
        if (erroQtd) throw new ErroVenda(erroQtd, 'quantidade');
        if (pedido.idCliente && !(await this.db.clientes.get(pedido.idCliente))) {
          throw new ErroVenda('Cliente não encontrado.', 'cliente');
        }
        const forma = pedido.forma as FormaPagamento;
        const item = {
          id_item: crypto.randomUUID(),
          id_produto: produto.id_produto,
          quantidade: pedido.quantidade,
          preco_unitario: produto.preco_venda,
          custo_unitario: produto.preco_custo,
        };
        const venda: Venda = {
          id_venda: crypto.randomUUID(),
          data_venda: new Date().toISOString(),
          forma_pagamento: forma,
          valor_total: calcularTotal([item]),
          canal: 'presencial',
          id_cliente: forma === 'fiado' ? pedido.idCliente : null,
          status_pagamento: statusInicial(forma),
          data_quitacao: null,
          itens: [item],
          sincronizado: 0,
        };
        await this.db.vendas.add(venda);
        await this.db.produtos.update(produto.id_produto, {
          quantidade_estoque: produto.quantidade_estoque - pedido.quantidade,
          atualizado_em: venda.data_venda,
          sincronizado: 0,
        });
        return venda.id_venda;
      });
      this.sync.agendar();
      return { ok: true, idVenda };
    } catch (erro) {
      if (erro instanceof ErroVenda) return { ok: false, erro: erro.message, campo: erro.campo };
      return { ok: false, erro: 'Não foi possível salvar a venda. Tente de novo.', campo: 'peca' };
    }
  }

  async cadastrarCliente(nome: string, telefone: string): Promise<{ cliente?: Cliente; erro?: string }> {
    const erro = validarNomeCliente(nome);
    if (erro) return { erro };
    const tel = telefone.trim();
    if (tel && !/^[0-9 ()+-]{8,20}$/.test(tel)) return { erro: 'Telefone inválido. Use só números.' };
    const cliente: Cliente = {
      id_cliente: crypto.randomUUID(),
      nome: nome.trim(),
      telefone: tel || null,
      observacao: null,
      criado_em: new Date().toISOString(),
      sincronizado: 0,
    };
    await this.clientes.salvar(cliente);
    this.sync.agendar();
    return { cliente };
  }

  listarClientes(): Promise<Cliente[]> {
    return this.clientes.listar();
  }

  obterVenda(id: string): Promise<Venda | undefined> {
    return this.vendas.obter(id);
  }

  /** RF06: clientes com fiado pendente, saldo de cada um e total a receber. */
  async resumoFiado(): Promise<{ clientes: SaldoCliente[]; total: number }> {
    const pendentes = await this.vendas.fiadoPendente();
    const ids = [...new Set(pendentes.map((v) => v.id_cliente).filter((id): id is string => !!id))];
    const clientes: SaldoCliente[] = [];
    for (const id of ids) {
      const cliente = await this.clientes.obter(id);
      if (!cliente) continue;
      const vendas = pendentes.filter((v) => v.id_cliente === id).sort((a, b) => a.data_venda.localeCompare(b.data_venda));
      clientes.push({ cliente, saldo: saldoDevedor(vendas), vendas });
    }
    clientes.sort((a, b) => a.cliente.nome.localeCompare(b.cliente.nome, 'pt-BR'));
    return { clientes, total: saldoDevedor(pendentes) };
  }

  async saldoDoCliente(idCliente: string): Promise<number> {
    return saldoDevedor(await this.vendas.fiadoPendente(), idCliente);
  }

  /** RF07: marca uma venda no fiado como paga. */
  async quitar(idVenda: string): Promise<string | null> {
    const venda = await this.vendas.obter(idVenda);
    if (!venda || venda.forma_pagamento !== 'fiado' || venda.status_pagamento !== 'pendente') {
      return 'Essa venda não está pendente.';
    }
    await this.db.vendas.update(idVenda, {
      status_pagamento: 'pago',
      data_quitacao: new Date().toISOString().slice(0, 10),
      sincronizado: 0,
    });
    this.sync.agendar();
    return null;
  }
}

class ErroVenda extends Error {
  constructor(mensagem: string, readonly campo: 'peca' | 'quantidade' | 'pagamento' | 'cliente') {
    super(mensagem);
  }
}
