import { authedSupabase } from "@/lib/auth";
import CarrinhoView from "@/components/atacado/CarrinhoView";
import { carregarCarrinho } from "../dados";

export default async function CarrinhoAtacadoPage() {
  const db = await authedSupabase();
  const carrinho = await carregarCarrinho(db);

  if (!carrinho) {
    return <p className="atc-vazio">Não foi possível carregar seu carrinho agora. Tente de novo em instantes.</p>;
  }
  return <CarrinhoView itens={carrinho.itens} skus={carrinho.sku_distintos} total={carrinho.total} />;
}
