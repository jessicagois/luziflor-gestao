/** Regras do estoque: cadastro de peças (RF01), entrada (RF02) e consulta (RF03). */
import { Injectable, inject } from '@angular/core';
import { Categoria, Produto } from './modelos';
import { ProdutoRepositorio } from './repositorios';
import { validarProduto } from './regras';
import { SyncService } from './sync.service';

export interface NovaPeca {
  nome: string;
  categoria: Categoria;
  tamanho: string;
  preco_custo: number;
  preco_venda: number;
  quantidade: number;
}

@Injectable({ providedIn: 'root' })
export class EstoqueService {
  private readonly produtos = inject(ProdutoRepositorio);
  private readonly sync = inject(SyncService);

  buscar(texto: string): Promise<Produto[]> {
    return this.produtos.buscar(texto);
  }

  /** Retorna a lista de erros; vazia significa que a peça foi cadastrada. */
  async cadastrar(dados: NovaPeca): Promise<string[]> {
    const erros = validarProduto(dados);
    if (erros.length) return erros;
    if (await this.produtos.existeNomeTamanho(dados.nome.trim(), dados.tamanho.trim().toUpperCase())) {
      return ['Essa peça já está cadastrada nesse tamanho. Use "Entrada" para somar peças.'];
    }
    const agora = new Date().toISOString();
    await this.produtos.salvar({
      id_produto: crypto.randomUUID(),
      nome: dados.nome.trim(),
      categoria: dados.categoria,
      tamanho: dados.tamanho.trim().toUpperCase(),
      preco_custo: dados.preco_custo,
      preco_venda: dados.preco_venda,
      quantidade_estoque: dados.quantidade,
      ativo: true,
      criado_em: agora,
      atualizado_em: agora,
      sincronizado: 0,
    });
    this.sync.agendar();
    return [];
  }

  async registrarEntrada(idProduto: string, quantidade: number): Promise<string | null> {
    if (!Number.isInteger(quantidade) || quantidade <= 0) return 'A quantidade precisa ser maior que zero.';
    const produto = await this.produtos.obter(idProduto);
    if (!produto || !produto.ativo) return 'Peça não encontrada.';
    await this.produtos.salvar({
      ...produto,
      quantidade_estoque: produto.quantidade_estoque + quantidade,
      atualizado_em: new Date().toISOString(),
      sincronizado: 0,
    });
    this.sync.agendar();
    return null;
  }
}
