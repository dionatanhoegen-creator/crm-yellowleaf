export interface Produto {
  ativo: string;
  preco_grama: number | null;
  preco_grama_minimo: number | null;
  dosagem_usual: string;
  validade: string;
  quantidade_doses: string;
  estoque_100g: number | null;
  estoque_250g: number | null;
  estoque_1000g: number | null;
  peso_total_kg: number | null;
}
