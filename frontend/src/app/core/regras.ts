/**
 * Regras de negócio puras (sem tela e sem banco), testadas em regras.spec.ts.
 * As mesmas regras são conferidas de novo no servidor (backend/app/regras.py).
 */
import { FormaPagamento, StatusPagamento, Venda } from './modelos';

export const LIMITE_ESTOQUE_BAIXO = 2;

/** Soma quantidade x preço, arredondando para centavos. */
export function calcularTotal(itens: { quantidade: number; preco_unitario: number }[]): number {
  const centavos = itens.reduce((soma, i) => soma + i.quantidade * Math.round(i.preco_unitario * 100), 0);
  return centavos / 100;
}

/** Retorna a mensagem de erro, ou null se a quantidade pode ser vendida. */
export function validarQuantidade(quantidade: number, estoqueDisponivel: number): string | null {
  if (!Number.isInteger(quantidade) || quantidade <= 0) return 'A quantidade precisa ser maior que zero.';
  if (estoqueDisponivel <= 0) return 'Esta peça está sem estoque.';
  if (quantidade > estoqueDisponivel) {
    return `Só tem ${estoqueDisponivel} no estoque. Diminua a quantidade.`;
  }
  return null;
}

export function validarCliente(forma: FormaPagamento | null, idCliente: string | null): string | null {
  if (!forma) return 'Escolha como a cliente vai pagar.';
  if (forma === 'fiado' && !idCliente) return 'Escolha o cliente para vender no fiado.';
  return null;
}

export function statusInicial(forma: FormaPagamento): StatusPagamento {
  return forma === 'fiado' ? 'pendente' : 'pago';
}

/** Saldo devedor: soma das vendas no fiado ainda pendentes (opcionalmente de um cliente). */
export function saldoDevedor(vendas: Venda[], idCliente?: string): number {
  const pendentes = vendas.filter(
    (v) => v.forma_pagamento === 'fiado' && v.status_pagamento === 'pendente' && (!idCliente || v.id_cliente === idCliente),
  );
  return calcularTotal(pendentes.map((v) => ({ quantidade: 1, preco_unitario: v.valor_total })));
}

export function estoqueBaixo(quantidade: number): boolean {
  return quantidade <= LIMITE_ESTOQUE_BAIXO;
}

/** Valida os dados de uma peça nova. Retorna a lista de problemas (vazia = ok). */
export function validarProduto(dados: {
  nome: string; tamanho: string; preco_custo: number; preco_venda: number; quantidade: number;
}): string[] {
  const erros: string[] = [];
  if (!dados.nome.trim()) erros.push('Informe o nome da peça.');
  if (/[<>]/.test(dados.nome) || /[<>]/.test(dados.tamanho)) erros.push('Não use os sinais < ou >.');
  if (dados.nome.length > 100) erros.push('O nome pode ter até 100 letras.');
  if (!dados.tamanho.trim()) erros.push('Informe o tamanho.');
  if (!(dados.preco_custo > 0)) erros.push('O preço de custo precisa ser maior que zero.');
  if (!(dados.preco_venda > 0)) erros.push('O preço de venda precisa ser maior que zero.');
  if (!Number.isInteger(dados.quantidade) || dados.quantidade < 0) erros.push('A quantidade não pode ser negativa.');
  return erros;
}

export function validarNomeCliente(nome: string): string | null {
  if (!nome.trim()) return 'Informe o nome do cliente.';
  if (nome.length > 100) return 'O nome pode ter até 100 letras.';
  if (/[<>]/.test(nome)) return 'Não use os sinais < ou >.';
  return null;
}

const formatoReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function reais(valor: number): string {
  return formatoReais.format(valor);
}

/** Converte texto digitado ("45,90") em número. */
export function lerValor(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const numero = Number(limpo);
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : NaN;
}
