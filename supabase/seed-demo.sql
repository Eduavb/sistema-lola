-- Produtos fictícios para demonstrar a vitrine e o catálogo. Gerado por npm run demo:sql.
-- As imagens ficam em /demo/*.svg (pasta public/demo). Para remover: supabase/limpar-demo.sql.
insert into categorias (grupo, nome, slug, ordem, desconto_atacado_percentual) values
  ('calcados', 'Tênis', 'tenis', 1, 30),
  ('calcados', 'Sandálias', 'sandalia', 2, 30),
  ('calcados', 'Sapatilhas', 'sapatilha', 3, 30),
  ('acessorios', 'Bolsas', 'bolsas', 4, 30),
  ('acessorios', 'Acessórios', 'acessorios', 5, 30)
on conflict (slug) do update set ativo = true, desconto_atacado_percentual = coalesce(categorias.desconto_atacado_percentual, 30);

do $$ declare v_prod uuid; v_cor uuid; begin
  insert into products (slug, nome, categoria_id, colecao, preco, desconto_percentual, descricao, caracteristicas, ativo, destaque, ordem)
    values ('tenis-nuvem', 'Tênis Nuvem', (select id from categorias where slug = 'tenis'), 'Demonstração', 189.9, null,
      'Tênis leve para o dia todo, com solado macio e cara de verão.', array['Peça de demonstração', 'Material sintético macio', 'Fabricação nacional'], true, true, 1)
    on conflict (slug) do nothing returning id into v_prod;
  if v_prod is null then return; end if;
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Rosa', '#F2678F', array['/demo/tenis-nuvem-rosa.svg'], 0) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 4), (v_cor, '35', 5), (v_cor, '36', 6), (v_cor, '37', 7), (v_cor, '38', 3), (v_cor, '39', 4);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Menta', '#5FCBA9', array['/demo/tenis-nuvem-menta.svg'], 1) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 5), (v_cor, '35', 6), (v_cor, '36', 7), (v_cor, '37', 3), (v_cor, '38', 4), (v_cor, '39', 5);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Off-white', '#E9DCCB', array['/demo/tenis-nuvem-off-white.svg'], 2) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 6), (v_cor, '35', 7), (v_cor, '36', 3), (v_cor, '37', 4), (v_cor, '38', 5), (v_cor, '39', 6);
end $$;

do $$ declare v_prod uuid; v_cor uuid; begin
  insert into products (slug, nome, categoria_id, colecao, preco, desconto_percentual, descricao, caracteristicas, ativo, destaque, ordem)
    values ('tenis-pulse', 'Tênis Pulse', (select id from categorias where slug = 'tenis'), 'Demonstração', 219.9, 15,
      'Visual esportivo com entressola alta e cadarço colorido.', array['Peça de demonstração', 'Material sintético macio', 'Fabricação nacional'], true, false, 2)
    on conflict (slug) do nothing returning id into v_prod;
  if v_prod is null then return; end if;
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Lilás', '#A87EF0', array['/demo/tenis-pulse-lilas.svg'], 0) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 5), (v_cor, '35', 6), (v_cor, '36', 7), (v_cor, '37', 3), (v_cor, '38', 4), (v_cor, '39', 5);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Pêssego', '#E8823A', array['/demo/tenis-pulse-pessego.svg'], 1) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 6), (v_cor, '35', 7), (v_cor, '36', 3), (v_cor, '37', 4), (v_cor, '38', 5), (v_cor, '39', 6);
end $$;

do $$ declare v_prod uuid; v_cor uuid; begin
  insert into products (slug, nome, categoria_id, colecao, preco, desconto_percentual, descricao, caracteristicas, ativo, destaque, ordem)
    values ('tenis-brisa', 'Tênis Brisa', (select id from categorias where slug = 'tenis'), 'Demonstração', 169.9, null,
      'Confortável e fácil de combinar com qualquer look.', array['Peça de demonstração', 'Material sintético macio', 'Fabricação nacional'], true, false, 3)
    on conflict (slug) do nothing returning id into v_prod;
  if v_prod is null then return; end if;
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Menta', '#5FCBA9', array['/demo/tenis-brisa-menta.svg'], 0) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 6), (v_cor, '35', 7), (v_cor, '36', 3), (v_cor, '37', 4), (v_cor, '38', 5), (v_cor, '39', 6);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Rosa', '#F2678F', array['/demo/tenis-brisa-rosa.svg'], 1) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 7), (v_cor, '35', 3), (v_cor, '36', 4), (v_cor, '37', 5), (v_cor, '38', 6), (v_cor, '39', 7);
end $$;

do $$ declare v_prod uuid; v_cor uuid; begin
  insert into products (slug, nome, categoria_id, colecao, preco, desconto_percentual, descricao, caracteristicas, ativo, destaque, ordem)
    values ('sandalia-mare', 'Sandália Maré', (select id from categorias where slug = 'sandalia'), 'Demonstração', 129.9, null,
      'Tiras macias e palmilha anatômica para andar sem pressa.', array['Peça de demonstração', 'Material sintético macio', 'Fabricação nacional'], true, true, 4)
    on conflict (slug) do nothing returning id into v_prod;
  if v_prod is null then return; end if;
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Pêssego', '#E8823A', array['/demo/sandalia-mare-pessego.svg'], 0) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 7), (v_cor, '35', 3), (v_cor, '36', 4), (v_cor, '37', 5), (v_cor, '38', 6), (v_cor, '39', 7);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Rosa', '#F2678F', array['/demo/sandalia-mare-rosa.svg'], 1) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 3), (v_cor, '35', 4), (v_cor, '36', 5), (v_cor, '37', 6), (v_cor, '38', 7), (v_cor, '39', 3);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Menta', '#5FCBA9', array['/demo/sandalia-mare-menta.svg'], 2) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 4), (v_cor, '35', 5), (v_cor, '36', 6), (v_cor, '37', 7), (v_cor, '38', 3), (v_cor, '39', 4);
end $$;

do $$ declare v_prod uuid; v_cor uuid; begin
  insert into products (slug, nome, categoria_id, colecao, preco, desconto_percentual, descricao, caracteristicas, ativo, destaque, ordem)
    values ('sandalia-aurora', 'Sandália Aurora', (select id from categorias where slug = 'sandalia'), 'Demonstração', 149.9, null,
      'Sandália de tiras finas, perfeita para os dias de sol.', array['Peça de demonstração', 'Material sintético macio', 'Fabricação nacional'], true, false, 5)
    on conflict (slug) do nothing returning id into v_prod;
  if v_prod is null then return; end if;
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Lilás', '#A87EF0', array['/demo/sandalia-aurora-lilas.svg'], 0) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 3), (v_cor, '35', 4), (v_cor, '36', 5), (v_cor, '37', 6), (v_cor, '38', 7), (v_cor, '39', 3);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Off-white', '#E9DCCB', array['/demo/sandalia-aurora-off-white.svg'], 1) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 4), (v_cor, '35', 5), (v_cor, '36', 6), (v_cor, '37', 7), (v_cor, '38', 3), (v_cor, '39', 4);
end $$;

do $$ declare v_prod uuid; v_cor uuid; begin
  insert into products (slug, nome, categoria_id, colecao, preco, desconto_percentual, descricao, caracteristicas, ativo, destaque, ordem)
    values ('sandalia-coral', 'Sandália Coral', (select id from categorias where slug = 'sandalia'), 'Demonstração', 119.9, 10,
      'Rasteira com tiras duplas e fecho ajustável.', array['Peça de demonstração', 'Material sintético macio', 'Fabricação nacional'], true, false, 6)
    on conflict (slug) do nothing returning id into v_prod;
  if v_prod is null then return; end if;
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Rosa', '#F2678F', array['/demo/sandalia-coral-rosa.svg'], 0) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 4), (v_cor, '35', 5), (v_cor, '36', 6), (v_cor, '37', 7), (v_cor, '38', 3), (v_cor, '39', 4);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Pêssego', '#E8823A', array['/demo/sandalia-coral-pessego.svg'], 1) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 5), (v_cor, '35', 6), (v_cor, '36', 7), (v_cor, '37', 3), (v_cor, '38', 4), (v_cor, '39', 5);
end $$;

do $$ declare v_prod uuid; v_cor uuid; begin
  insert into products (slug, nome, categoria_id, colecao, preco, desconto_percentual, descricao, caracteristicas, ativo, destaque, ordem)
    values ('sapatilha-laco', 'Sapatilha Laço', (select id from categorias where slug = 'sapatilha'), 'Demonstração', 99.9, null,
      'Sapatilha clássica com laço delicado.', array['Peça de demonstração', 'Material sintético macio', 'Fabricação nacional'], true, false, 7)
    on conflict (slug) do nothing returning id into v_prod;
  if v_prod is null then return; end if;
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Rosa', '#F2678F', array['/demo/sapatilha-laco-rosa.svg'], 0) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 5), (v_cor, '35', 6), (v_cor, '36', 7), (v_cor, '37', 3), (v_cor, '38', 4), (v_cor, '39', 5);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Lilás', '#A87EF0', array['/demo/sapatilha-laco-lilas.svg'], 1) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 6), (v_cor, '35', 7), (v_cor, '36', 3), (v_cor, '37', 4), (v_cor, '38', 5), (v_cor, '39', 6);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Off-white', '#E9DCCB', array['/demo/sapatilha-laco-off-white.svg'], 2) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 7), (v_cor, '35', 3), (v_cor, '36', 4), (v_cor, '37', 5), (v_cor, '38', 6), (v_cor, '39', 7);
end $$;

do $$ declare v_prod uuid; v_cor uuid; begin
  insert into products (slug, nome, categoria_id, colecao, preco, desconto_percentual, descricao, caracteristicas, ativo, destaque, ordem)
    values ('sapatilha-doce', 'Sapatilha Doce', (select id from categorias where slug = 'sapatilha'), 'Demonstração', 109.9, null,
      'Bico arredondado e palmilha acolchoada.', array['Peça de demonstração', 'Material sintético macio', 'Fabricação nacional'], true, false, 8)
    on conflict (slug) do nothing returning id into v_prod;
  if v_prod is null then return; end if;
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Menta', '#5FCBA9', array['/demo/sapatilha-doce-menta.svg'], 0) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 6), (v_cor, '35', 7), (v_cor, '36', 3), (v_cor, '37', 4), (v_cor, '38', 5), (v_cor, '39', 6);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Pêssego', '#E8823A', array['/demo/sapatilha-doce-pessego.svg'], 1) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, '34', 7), (v_cor, '35', 3), (v_cor, '36', 4), (v_cor, '37', 5), (v_cor, '38', 6), (v_cor, '39', 7);
end $$;

do $$ declare v_prod uuid; v_cor uuid; begin
  insert into products (slug, nome, categoria_id, colecao, preco, desconto_percentual, descricao, caracteristicas, ativo, destaque, ordem)
    values ('bolsa-pop', 'Bolsa Pop', (select id from categorias where slug = 'bolsas'), 'Demonstração', 159.9, null,
      'Bolsa estruturada com alça de mão e fecho magnético.', array['Peça de demonstração', 'Material sintético macio', 'Fabricação nacional'], true, true, 9)
    on conflict (slug) do nothing returning id into v_prod;
  if v_prod is null then return; end if;
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Rosa', '#F2678F', array['/demo/bolsa-pop-rosa.svg'], 0) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, 'Único', 7);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Lilás', '#A87EF0', array['/demo/bolsa-pop-lilas.svg'], 1) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, 'Único', 3);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Menta', '#5FCBA9', array['/demo/bolsa-pop-menta.svg'], 2) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, 'Único', 4);
end $$;

do $$ declare v_prod uuid; v_cor uuid; begin
  insert into products (slug, nome, categoria_id, colecao, preco, desconto_percentual, descricao, caracteristicas, ativo, destaque, ordem)
    values ('bolsa-sol', 'Bolsa Sol', (select id from categorias where slug = 'bolsas'), 'Demonstração', 139.9, 20,
      'Espaçosa, leve e com alça reforçada.', array['Peça de demonstração', 'Material sintético macio', 'Fabricação nacional'], true, false, 10)
    on conflict (slug) do nothing returning id into v_prod;
  if v_prod is null then return; end if;
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Pêssego', '#E8823A', array['/demo/bolsa-sol-pessego.svg'], 0) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, 'Único', 3);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Off-white', '#E9DCCB', array['/demo/bolsa-sol-off-white.svg'], 1) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, 'Único', 4);
end $$;

do $$ declare v_prod uuid; v_cor uuid; begin
  insert into products (slug, nome, categoria_id, colecao, preco, desconto_percentual, descricao, caracteristicas, ativo, destaque, ordem)
    values ('scrunchie-cetim', 'Scrunchie Cetim', (select id from categorias where slug = 'acessorios'), 'Demonstração', 19.9, null,
      'Xuxinha de cetim que não marca o cabelo.', array['Peça de demonstração', 'Material sintético macio', 'Fabricação nacional'], true, false, 11)
    on conflict (slug) do nothing returning id into v_prod;
  if v_prod is null then return; end if;
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Rosa', '#F2678F', array['/demo/scrunchie-cetim-rosa.svg'], 0) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, 'Único', 4);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Lilás', '#A87EF0', array['/demo/scrunchie-cetim-lilas.svg'], 1) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, 'Único', 5);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Menta', '#5FCBA9', array['/demo/scrunchie-cetim-menta.svg'], 2) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, 'Único', 6);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Pêssego', '#E8823A', array['/demo/scrunchie-cetim-pessego.svg'], 3) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, 'Único', 7);
end $$;

do $$ declare v_prod uuid; v_cor uuid; begin
  insert into products (slug, nome, categoria_id, colecao, preco, desconto_percentual, descricao, caracteristicas, ativo, destaque, ordem)
    values ('scrunchie-maxi', 'Scrunchie Maxi', (select id from categorias where slug = 'acessorios'), 'Demonstração', 24.9, null,
      'Versão maxi para dar volume ao penteado.', array['Peça de demonstração', 'Material sintético macio', 'Fabricação nacional'], true, false, 12)
    on conflict (slug) do nothing returning id into v_prod;
  if v_prod is null then return; end if;
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Off-white', '#E9DCCB', array['/demo/scrunchie-maxi-off-white.svg'], 0) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, 'Único', 5);
  insert into product_colors (product_id, nome, hex, imagens, ordem)
    values (v_prod, 'Rosa', '#F2678F', array['/demo/scrunchie-maxi-rosa.svg'], 1) returning id into v_cor;
  insert into product_sizes (color_id, tamanho, estoque) values (v_cor, 'Único', 6);
end $$;
