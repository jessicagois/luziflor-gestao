import { describe, expect, it } from 'vitest';
import { Venda } from './modelos';
import {
  calcularTotal, estoqueBaixo, lerValor, saldoDevedor, statusInicial, validarCliente,
  validarNomeCliente, validarProduto, validarQuantidade,
} from './regras';

function venda(parcial: Partial<Venda>): Venda {
  return {
    id_venda: crypto.randomUUID(), data_venda: '2026-11-14T10:00:00', forma_pagamento: 'fiado', valor_total: 45,
    canal: 'presencial', id_cliente: 'maria', status_pagamento: 'pendente', data_quitacao: null, itens: [],
    sincronizado: 0, ...parcial,
  };
}

describe('RF04 - registro de venda', () => {
  it('calcula o total sem erro de centavos', () => {
    expect(calcularTotal([{ quantidade: 3, preco_unitario: 0.1 }])).toBe(0.3);
    expect(calcularTotal([{ quantidade: 2, preco_unitario: 45 }, { quantidade: 1, preco_unitario: 30.5 }])).toBe(120.5);
  });

  it('bloqueia venda acima do estoque com mensagem clara', () => {
    expect(validarQuantidade(2, 1)).toBe('Só tem 1 no estoque. Diminua a quantidade.');
    expect(validarQuantidade(1, 0)).toBe('Esta peça está sem estoque.');
    expect(validarQuantidade(0, 5)).not.toBeNull();
    expect(validarQuantidade(3, 3)).toBeNull();
  });
});

describe('RF05 a RF07 - fiado', () => {
  it('exige cliente no fiado', () => {
    expect(validarCliente('fiado', null)).toBe('Escolha o cliente para vender no fiado.');
    expect(validarCliente('fiado', 'maria')).toBeNull();
    expect(validarCliente('pix', null)).toBeNull();
    expect(validarCliente(null, null)).not.toBeNull();
  });

  it('fiado começa pendente; as outras formas começam pagas', () => {
    expect(statusInicial('fiado')).toBe('pendente');
    expect(statusInicial('dinheiro')).toBe('pago');
  });

  it('saldo soma só o fiado pendente do cliente', () => {
    const vendas = [
      venda({ valor_total: 75 }),
      venda({ valor_total: 45 }),
      venda({ valor_total: 100, status_pagamento: 'pago' }),
      venda({ valor_total: 60, forma_pagamento: 'pix', status_pagamento: 'pago', id_cliente: null }),
      venda({ valor_total: 30, id_cliente: 'joana' }),
    ];
    expect(saldoDevedor(vendas, 'maria')).toBe(120);
    expect(saldoDevedor(vendas)).toBe(150);
  });
});

describe('RF01 - cadastro de peça e entradas', () => {
  it('aceita peça válida e recusa dados inválidos', () => {
    expect(validarProduto({ nome: 'Blusa de malha', tamanho: 'M', preco_custo: 25, preco_venda: 45, quantidade: 3 })).toEqual([]);
    const erros = validarProduto({ nome: '<script>', tamanho: '', preco_custo: 0, preco_venda: -1, quantidade: -2 });
    expect(erros.length).toBeGreaterThanOrEqual(4);
  });

  it('recusa nome de cliente com marcação', () => {
    expect(validarNomeCliente('<b>Maria</b>')).not.toBeNull();
    expect(validarNomeCliente('Maria Souza')).toBeNull();
  });

  it('lê valores digitados no formato brasileiro', () => {
    expect(lerValor('45,90')).toBe(45.9);
    expect(lerValor('R$ 1.250,00')).toBe(1250);
  });

  it('avisa estoque baixo com 2 peças ou menos', () => {
    expect(estoqueBaixo(2)).toBe(true);
    expect(estoqueBaixo(3)).toBe(false);
  });
});
