-- A API troca para a role `authenticated` após validar o JWT. A política RLS
-- de `projetos` já limita cada pessoa aos projetos dos quais é membro, mas o
-- Supabase não concedeu o privilégio de tabela necessário para a consulta
-- alcançar essa política. Sem este GRANT, GET /api/v1/projetos retorna 500
-- com "permission denied for table projetos".
--
-- Escopo deliberadamente mínimo: apenas leitura da tabela que alimenta a
-- listagem inicial. Escritas continuam no caminho SECURITY DEFINER e nas
-- permissões específicas de cada recurso.
grant select on table public.projetos to authenticated;

