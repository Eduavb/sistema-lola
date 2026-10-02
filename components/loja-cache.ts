"use client";

import { useEffect, useSyncExternalStore } from "react";

export type Cache<T> = {
  get: () => T | null;
  set: (v: T) => void;
  subscribe: (cb: () => void) => () => void;
};

export function criarCache<T>(): Cache<T> {
  let valor: T | null = null;
  const ouvintes = new Set<() => void>();
  return {
    get: () => valor,
    set: (v) => {
      valor = v;
      ouvintes.forEach((cb) => cb());
    },
    subscribe: (cb) => {
      ouvintes.add(cb);
      return () => ouvintes.delete(cb);
    },
  };
}

/**
 * Devolve os últimos dados conhecidos (null até haver algum). O servidor e a
 * hidratação sempre partem de null, então o primeiro render casa com o SSR;
 * navegações seguintes já saem preenchidas pelo cache do módulo.
 */
export function useSnapshotCache<T>(cache: Cache<T>): T | null {
  return useSyncExternalStore(cache.subscribe, cache.get, () => null);
}

export function useDadosCacheados<T>(cache: Cache<T>, buscar: () => Promise<T>): T | null {
  const dados = useSnapshotCache(cache);
  useEffect(() => {
    let ativo = true;
    buscar()
      .then((d) => {
        if (ativo) cache.set(d);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [cache, buscar]);
  return dados;
}
