/** Entidades do MVP (iguais às do banco no servidor). */

export type Categoria = 'feminino' | 'masculino' | 'infantil';
export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao' | 'fiado';
export type StatusPagamento = 'pago' | 'pendente';
export type Canal = 'presencial' | 'whatsapp';

/** 0 = ainda não enviado ao servidor; 1 = sincronizado. */
export type Sincronizado = 0 | 1;

export interface Produto {
  id_produto: string;
  nome: string;
  categoria: Categoria;
  tamanho: string;
  preco_custo: number;
  preco_venda: number;
  quantidade_estoque: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  sincronizado: Sincronizado;
}

export interface Cliente {
  id_cliente: string;
  nome: string;
  telefone: string | null;
  observacao: string | null;
  criado_em: string;
  sincronizado: Sincronizado;
}

export interface ItemVenda {
  id_item: string;
  id_produto: string;
  quantidade: number;
  preco_unitario: number;
  custo_unitario: number;
}

export interface Venda {
  id_venda: string;
  data_venda: string;
  forma_pagamento: FormaPagamento;
  valor_total: number;
  canal: Canal;
  id_cliente: string | null;
  status_pagamento: StatusPagamento;
  data_quitacao: string | null;
  itens: ItemVenda[];
  sincronizado: Sincronizado;
}

export const NOMES_PAGAMENTO: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao: 'Cartão',
  fiado: 'Fiado',
};
