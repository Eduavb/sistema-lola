import { authedSupabase } from "@/lib/auth";
import CatalogoGrid from "@/components/atacado/CatalogoGrid";
import { carregarCarrinho, carregarCatalogo } from "../dados";

export default async function CatalogoAtacadoPage() {
  const db = await authedSupabase();
  const [catalogo, carrinho] = await Promise.all([carregarCatalogo(db), carregarCarrinho(db)]);

  if (!catalogo) {
    return <p className="atc-vazio">Não foi possível carregar o catálogo agora. Tente de novo em instantes.</p>;
  }
  if (catalogo.produtos.length === 0) {
    return <p className="atc-vazio">Nenhum produto disponível no momento.</p>;
  }

  const noCarrinho = (carrinho?.itens ?? []).map((i) => ({
    size_id: i.size_id,
    quantidade: i.quantidade,
  }));

  return (
    <CatalogoGrid
      produtos={catalogo.produtos.map(({ id, nome, categoria, preco, cores }) => ({
        id,
        nome,
        categoria,
        preco,
        cores,
      }))}
      noCarrinho={noCarrinho}
    />
  );
}
