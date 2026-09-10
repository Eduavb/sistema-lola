"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  key: string; // produtoId + colorId + sizeId
  produtoId: string;
  colorId: string;
  sizeId: string | null;
  nome: string;
  corNome: string | null;
  tamanho: string | null;
  precoUnit: number;
  imagem: string | null;
  quantidade: number;
  maxEstoque: number | null;
};

const STORAGE_KEY = "lola_cart_v1";

export function makeCartKey(produtoId: string, colorId: string, sizeId: string | null) {
  return [produtoId, colorId, sizeId ?? ""].join("::");
}

export function calcTotais(items: CartItem[]): { totalItens: number; totalValor: number } {
  const totalItens = items.reduce((s, i) => s + i.quantidade, 0);
  const totalValor = items.reduce((s, i) => s + i.quantidade * i.precoUnit, 0);
  return { totalItens, totalValor };
}

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "key">) => void;
  removeItem: (key: string) => void;
  setQuantidade: (key: string, quantidade: number) => void;
  clear: () => void;
  totalItens: number;
  totalValor: number;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // Hidratação SSR-safe: localStorage só existe depois do mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // localStorage indisponível ou corrompido — segue com carrinho vazio
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // sem espaço/privado — carrinho continua funcionando só nesta sessão
    }
  }, [items, hydrated]);

  function addItem(item: Omit<CartItem, "key">) {
    const key = makeCartKey(item.produtoId, item.colorId, item.sizeId);
    setItems((prev) => {
      const existente = prev.find((i) => i.key === key);
      if (existente) {
        const novaQtd = existente.maxEstoque != null
          ? Math.min(existente.quantidade + item.quantidade, existente.maxEstoque)
          : existente.quantidade + item.quantidade;
        return prev.map((i) => (i.key === key ? { ...i, quantidade: novaQtd } : i));
      }
      return [...prev, { ...item, key }];
    });
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function setQuantidade(key: string, quantidade: number) {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.key !== key) return i;
          const q = i.maxEstoque != null ? Math.min(Math.max(1, quantidade), i.maxEstoque) : Math.max(1, quantidade);
          return { ...i, quantidade: q };
        })
        .filter((i) => i.quantidade > 0)
    );
  }

  function clear() {
    setItems([]);
  }

  const totalItens = useMemo(() => calcTotais(items).totalItens, [items]);
  const totalValor = useMemo(() => calcTotais(items).totalValor, [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, setQuantidade, clear, totalItens, totalValor, hydrated }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}
