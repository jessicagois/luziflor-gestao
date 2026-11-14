/**
 * Camada de dados do aparelho (padrão Repository).
 * As telas e serviços não sabem se os dados vêm do celular ou do servidor.
 */
import { Injectable, inject } from '@angular/core';
import { BancoService } from './banco';
import { Cliente, Produto, Venda } from './modelos';

@Injectable({ providedIn: 'root' })
export class ProdutoRepositorio {
  private readonly db = inject(BancoService).db;

  listarAtivos(): Promise<Produto[]> {
    return this.db.produtos.filter((p) => p.ativo).sortBy('nome');
  }

  async buscar(texto: string): Promise<Produto[]> {
    const termo = texto.trim().toLocaleLowerCase('pt-BR');
    const todos = await this.listarAtivos();
    return termo ? todos.filter((p) => p.nome.toLocaleLowerCase('pt-BR').includes(termo)) : todos;
  }

  obter(id: string): Promise<Produto | undefined> {
    return this.db.produtos.get(id);
  }

  async existeNomeTamanho(nome: string, tamanho: string): Promise<boolean> {
    return (await this.db.produtos.where('[nome+tamanho]').equals([nome.trim(), tamanho.trim()]).count()) > 0;
  }

  salvar(produto: Produto): Promise<string> {
    return this.db.produtos.put(produto);
  }

  pendentes(): Promise<Produto[]> {
    return this.db.produtos.where('sincronizado').equals(0).toArray();
  }

  marcarSincronizado(id: string): Promise<number> {
    return this.db.produtos.update(id, { sincronizado: 1 });
  }
}

@Injectable({ providedIn: 'root' })
export class ClienteRepositorio {
  private readonly db = inject(BancoService).db;

  listar(): Promise<Cliente[]> {
    return this.db.clientes.orderBy('nome').toArray();
  }

  obter(id: string): Promise<Cliente | undefined> {
    return this.db.clientes.get(id);
  }

  salvar(cliente: Cliente): Promise<string> {
    return this.db.clientes.put(cliente);
  }

  pendentes(): Promise<Cliente[]> {
    return this.db.clientes.where('sincronizado').equals(0).toArray();
  }

  marcarSincronizado(id: string): Promise<number> {
    return this.db.clientes.update(id, { sincronizado: 1 });
  }
}

@Injectable({ providedIn: 'root' })
export class VendaRepositorio {
  private readonly db = inject(BancoService).db;

  obter(id: string): Promise<Venda | undefined> {
    return this.db.vendas.get(id);
  }

  fiadoPendente(): Promise<Venda[]> {
    return this.db.vendas.where('[forma_pagamento+status_pagamento]').equals(['fiado', 'pendente']).toArray();
  }

  pendentes(): Promise<Venda[]> {
    return this.db.vendas.where('sincronizado').equals(0).toArray();
  }

  marcarSincronizado(id: string): Promise<number> {
    return this.db.vendas.update(id, { sincronizado: 1 });
  }
}
