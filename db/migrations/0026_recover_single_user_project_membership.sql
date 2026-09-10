-- Recuperação controlada de dados legados.
--
-- Alguns projetos foram criados antes da autenticação real e ficaram sem
-- membro válido. Só é seguro reparar automaticamente em um projeto Supabase
-- com EXATAMENTE um usuário, pois não existe ambiguidade sobre o proprietário.
-- O bloco não altera projetos que já tenham ao menos um membro válido.
do $$
declare
  v_only_user uuid;
begin
  if (select count(*) from auth.users) = 1 then
    select id into v_only_user from auth.users limit 1;

    insert into membros_projeto (projeto_id, user_id, papel)
    select p.id, v_only_user, 'admin'
    from projetos p
    where not exists (
      select 1
      from membros_projeto m
      join auth.users u on u.id = m.user_id
      where m.projeto_id = p.id
    )
    on conflict (projeto_id, user_id) do nothing;
  end if;
end $$;

