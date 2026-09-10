import {
  isLoggedIn,
  fetchProducts,
  fetchCategorias,
  fetchOrders,
  fetchSales,
  fetchConfig,
} from "./actions";
import LoginForm from "@/components/admin/LoginForm";
import AdminApp from "@/components/admin/AdminApp";

export const revalidate = 0;

export default async function AdminPage() {
  if (!(await isLoggedIn())) return <LoginForm />;

  const [products, categorias, orders, sales, config] = await Promise.all([
    fetchProducts(),
    fetchCategorias(),
    fetchOrders(),
    fetchSales(),
    fetchConfig(),
  ]);

  return (
    <AdminApp
      initialProducts={products}
      initialCategorias={categorias}
      initialOrders={orders}
      initialSales={sales}
      initialConfig={config}
    />
  );
}
