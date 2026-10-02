import CarrinhoView from "@/components/atacado/CarrinhoView";
import { carregarCarrinho } from "../dados";
import { exigirRevendedorAprovado } from "../gate";

export default async function CarrinhoAtacadoPage() {
  const g = await exigirRevendedorAprovado("/atacado/carrinho");
  if (!g.ok) return g.gate;
  const carrinho = await carregarCarrinho(g.db);

  if (!carrinho) {
    return <p className="atc-vazio">Não foi possível carregar seu carrinho agora. Tente de novo em instantes.</p>;
  }
  return <CarrinhoView itens={carrinho.itens} skus={carrinho.sku_distintos} total={carrinho.total} />;
}
