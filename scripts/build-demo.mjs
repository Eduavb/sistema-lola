// Gera os produtos fictícios da vitrine como SQL (supabase/seed-demo.sql) e as imagens (public/demo/*.svg).
// Os produtos usam a colecao 'Demonstração' para serem apagados de uma vez (supabase/limpar-demo.sql).
// Uso: npm run demo:sql
import { register } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

// Resolve o alias "@/..." do tsconfig para os arquivos .ts do projeto.
const loader = `
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    return next(${JSON.stringify(pathToFileURL(raiz + "/").href)} + specifier.slice(2) + ".ts", context);
  }
  return next(specifier, context);
}`;
register("data:text/javascript," + encodeURIComponent(loader), import.meta.url);

const { PRODUTOS_DEMO } = await import(pathToFileURL(join(raiz, "lib", "demo-catalogo.ts")).href);

// Categorias que já existem no banco (0003_seed) mantêm o slug; "Acessórios" é nova.
const SLUG_BANCO = { tenis: "tenis", sandalias: "sandalia", sapatilhas: "sapatilha", bolsas: "bolsas", acessorios: "acessorios" };
const sql = (s) => `'${String(s).replace(/'/g, "''")}'`;
const slugCor = (n) =>
  n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");

mkdirSync(join(raiz, "public", "demo"), { recursive: true });

const categorias = new Map();
const blocos = [];

for (const p of PRODUTOS_DEMO) {
  const slugCat = SLUG_BANCO[p.categoria.slug];
  categorias.set(slugCat, p.categoria);
  const cores = p.colors
    .map((c, ci) => {
      const arquivo = `${p.slug}-${slugCor(c.nome)}.svg`;
      const svg = decodeURIComponent(c.imagens[0].split(",")[1]);
      writeFileSync(join(raiz, "public", "demo", arquivo), svg, "utf8");
      const tamanhos = c.sizes.map((s) => `(v_cor, ${sql(s.tamanho)}, ${s.estoque})`).join(", ");
      return (
        `  insert into product_colors (product_id, nome, hex, imagens, ordem)\n` +
        `    values (v_prod, ${sql(c.nome)}, ${sql(c.hex)}, array[${sql("/demo/" + arquivo)}], ${ci}) returning id into v_cor;\n` +
        `  insert into product_sizes (color_id, tamanho, estoque) values ${tamanhos};`
      );
    })
    .join("\n");
  blocos.push(
    `do $$ declare v_prod uuid; v_cor uuid; begin\n` +
      `  insert into products (slug, nome, categoria_id, colecao, preco, desconto_percentual, descricao, caracteristicas, ativo, destaque, ordem)\n` +
      `    values (${sql(p.slug)}, ${sql(p.nome)}, (select id from categorias where slug = ${sql(slugCat)}), 'Demonstração', ${p.preco}, ${p.desconto_percentual ?? "null"},\n` +
      `      ${sql(p.descricao)}, array[${p.caracteristicas.map(sql).join(", ")}], true, ${p.destaque}, ${p.ordem})\n` +
      `    on conflict (slug) do nothing returning id into v_prod;\n` +
      `  if v_prod is null then return; end if;\n${cores}\nend $$;`
  );
}

const cats = [...categorias.entries()]
  .map(([slug, c]) => `  (${sql(c.grupo)}, ${sql(c.nome)}, ${sql(slug)}, ${c.ordem}, 30)`)
  .join(",\n");

const saida =
  `-- Produtos fictícios para demonstrar a vitrine e o catálogo. Gerado por npm run demo:sql.\n` +
  `-- As imagens ficam em /demo/*.svg (pasta public/demo). Para remover: supabase/limpar-demo.sql.\n` +
  `insert into categorias (grupo, nome, slug, ordem, desconto_atacado_percentual) values\n${cats}\n` +
  `on conflict (slug) do update set ativo = true, desconto_atacado_percentual = coalesce(categorias.desconto_atacado_percentual, 30);\n\n` +
  blocos.join("\n\n") +
  "\n";

writeFileSync(join(raiz, "supabase", "seed-demo.sql"), saida, "utf8");
writeFileSync(
  join(raiz, "supabase", "limpar-demo.sql"),
  `-- Remove os produtos fictícios da demonstração (cores e tamanhos saem em cascata).\n` +
    `delete from products where colecao = 'Demonstração';\n`,
  "utf8"
);
console.log(`${PRODUTOS_DEMO.length} produtos em supabase/seed-demo.sql e imagens em public/demo/`);
