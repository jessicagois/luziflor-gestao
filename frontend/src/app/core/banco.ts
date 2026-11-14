/** Banco local no celular (IndexedDB via Dexie): o app funciona sem internet. */
import { Injectable } from '@angular/core';
import Dexie, { type EntityTable } from 'dexie';
import { Cliente, Produto, Venda } from './modelos';

export class BancoLocal extends Dexie {
  produtos!: EntityTable<Produto, 'id_produto'>;
  clientes!: EntityTable<Cliente, 'id_cliente'>;
  vendas!: EntityTable<Venda, 'id_venda'>;

  constructor() {
    super('luziflor-gestao');
    this.version(1).stores({
      produtos: 'id_produto, nome, &[nome+tamanho], sincronizado',
      clientes: 'id_cliente, nome, sincronizado',
      vendas: 'id_venda, data_venda, id_cliente, [forma_pagamento+status_pagamento], sincronizado',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class BancoService {
  readonly db = new BancoLocal();
}
