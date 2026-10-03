import CatalogoGrid from "@/components/atacado/CatalogoGrid";
import { carregarCarrinho, carregarCatalogo } from "../dados";
import { exigirRevendedorAprovado } from "../gate";

export default async function CatalogoAtacadoPage() {
  const g = await exigirRevendedorAprovado("/atacado/catalogo");
  if (!g.ok) return g.gate;
  const [produtos, carrinho] = await Promise.all([carregarCatalogo(g.db), carregarCarrinho(g.db)]);

  if (!produtos) {
    return <p className="atc-vazio">Não foi possível carregar o catálogo agora. Tente de novo em instantes.</p>;
  }
  if (produtos.length === 0) {
    return <p className="atc-vazio">Nenhum produto disponível no momento.</p>;
  }

  const noCarrinho = (carrinho?.itens ?? []).map((i) => ({
    size_id: i.size_id,
    quantidade: i.quantidade,
  }));

  return <CatalogoGrid produtos={produtos} noCarrinho={noCarrinho} />;
}
