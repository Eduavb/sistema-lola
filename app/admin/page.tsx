import { authedSupabase, exigirPapel } from "@/lib/auth";
import { EQUIPE } from "@/lib/roles";
import { cargasIniciais } from "@/lib/admin-acesso";
import {
  lerConfig,
  listarCategorias,
  listarEstoqueBaixo,
  listarPedidos,
  listarProdutos,
  listarVendas,
} from "./consultas";
import AdminApp from "@/components/admin/AdminApp";

export const revalidate = 0;

export default async function AdminPage() {
  const perfil = await exigirPapel(EQUIPE, "/admin");
  const cargas = cargasIniciais(perfil.papel);
  const sb = await authedSupabase();

  const [products, categorias, orders, sales, config, estoqueBaixo] = await Promise.all([
    cargas.produtos ? listarProdutos(sb) : [],
    cargas.categorias ? listarCategorias(sb) : [],
    cargas.pedidos ? listarPedidos(sb, "todos") : [],
    cargas.vendas ? listarVendas(sb, "todos") : [],
    cargas.config ? lerConfig(sb) : null,
    cargas.estoqueBaixo ? listarEstoqueBaixo(sb) : [],
  ]);

  return (
    <AdminApp
      perfil={{ nome: perfil.nome || perfil.email, papel: perfil.papel }}
      initialProducts={products}
      initialCategorias={categorias}
      initialOrders={orders}
      initialSales={sales}
      initialConfig={config}
      initialEstoqueBaixo={estoqueBaixo}
    />
  );
}
