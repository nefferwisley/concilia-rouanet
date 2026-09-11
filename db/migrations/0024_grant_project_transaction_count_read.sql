-- GET /api/v1/projetos inclui a contagem de lançamentos por projeto. A RLS
-- de `transacoes` continua avaliando o vínculo do usuário ao projeto, mas a
-- role autenticada precisa do privilégio de leitura para a subconsulta chegar
-- à policy. Sem ele o Postgres interrompe a listagem com "permission denied".
--
-- Escopo mínimo: não permite escrita nem acesso a outra tabela.
grant select on table public.transacoes to authenticated;

