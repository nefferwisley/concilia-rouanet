# Guia de implantação da base online

Este guia cobre o frontend Vite, a API FastAPI e a migration `0015_real_import_foundation.sql`. A base online começa vazia: nenhum projeto de demonstração é criado pela migration.

## Pré-requisitos

- Python **3.11**. O `backend/Dockerfile` também fixa a imagem `python:3.11-slim`.
- Node.js e npm compatíveis com o `package-lock.json` do repositório.
- PostgreSQL 16 ou um projeto Supabase separado para homologação/produção.
- `psql` disponível para a aplicação controlada da migration.

Confirme o interpretador antes de instalar dependências:

```powershell
py -3.11 --version
py -3.11 -m venv .venv
& .\.venv\Scripts\python.exe -B -m pip install -r backend\requirements.txt
npm ci
```

O `-B` impede a criação de `__pycache__` durante os comandos Python deste guia.

## Variáveis públicas do frontend

Toda variável com prefixo `VITE_` é incorporada ao bundle e pode ser vista no navegador. Configure apenas estes três valores no provedor do frontend:

| Variável | Exemplo | Finalidade |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://seu-projeto.supabase.co` | URL pública do Supabase Auth. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` ou a chave `anon` legada | Chave pública para login no navegador. Nunca use `service_role`. |
| `VITE_API_URL` | `https://api.exemplo.com/api/v1` | Base pública da API; mantenha o sufixo `/api/v1`. |

Use `.env.example` como referência local. O build rejeita chaves com aparência de `service_role`, `sb_secret_` ou JWT de service role.

## Configuração privada do backend

Segredos são configurados somente no serviço FastAPI e nunca recebem prefixo `VITE_`:

| Variável | Secreta | Finalidade |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão direta/pooler com o PostgreSQL da aplicação. |
| `SUPABASE_JWT_SECRET` | sim | Validação HS256 legada dos tokens; mantenha enquanto houver sessões/chaves legadas. |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Acesso administrativo ao Storage. Deixe vazia quando esse acesso não for usado. |
| `GOOGLE_API_KEY` | sim | OCR Gemini opcional no backend. |
| `SUPABASE_URL` | não | URL usada pelo backend para obter o JWKS e validar tokens ES256. |
| `APP_ENV` | não | Use `dev` apenas localmente e `production` no deploy. |
| `CORS_ORIGINS` | não | Lista, separada por vírgulas, das origens permitidas do frontend. Não use `*` em produção. |

`backend/.env.example` contém o formato dos principais segredos locais. Arquivos `.env` reais e valores dos painéis de deploy não devem entrar no Git.

### Bloqueio obrigatório do login de demonstração

Defina no backend de produção:

```text
APP_ENV=production
```

Somente `APP_ENV=dev` habilita `POST /api/v1/dev/demo-login`. Em `production` (ou qualquer outro valor), a API responde `404` antes de consultar o banco.

## Execução local

Suba o PostgreSQL local e configure um `.env` na raiz a partir de `.env.example` e `backend/.env.example`. O banco do `docker-compose.yml` usa apenas credenciais locais de desenvolvimento.

```powershell
docker compose up -d postgres
& .\.venv\Scripts\python.exe -B -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Em outro terminal:

```powershell
npm run dev
```

Valide `http://127.0.0.1:8000/health` e acesse o endereço informado pelo Vite. O backend local executa o verificador de migrations no startup; em homologação e produção, aplique a `0015` previamente pelo procedimento controlado abaixo.

## Migration 0015: aplicação controlada

Não execute o runner genérico contra produção durante este gate. Aplique somente `db/migrations/0015_real_import_foundation.sql` em uma janela controlada.

1. Gere backup ou snapshot recuperável do banco alvo.
2. Teste primeiro em uma cópia de homologação.
3. Confirme que as migrations `0001` a `0014` já estão presentes e que o alvo não é o banco de produção usado por testes.
4. Use uma variável temporária com nome específico; não reutilize `TEST_DATABASE_URL`.
5. Execute o arquivo com interrupção no primeiro erro e só depois registre a migration.

```powershell
$env:MIGRATION_DATABASE_URL = "postgresql://usuario:senha@host:5432/banco_alvo"
psql "$env:MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0015_real_import_foundation.sql
psql "$env:MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -c "insert into schema_migrations (id) values ('0015_real_import_foundation.sql') on conflict (id) do nothing;"
Remove-Item Env:MIGRATION_DATABASE_URL
```

A própria `0015` usa `BEGIN`/`COMMIT`. Ela adiciona os campos regulatórios, restringe seus valores, recria as policies de RLS e a função atômica de criação, sem inserir projetos. Após a execução, verifique:

```sql
select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'projetos'
  and column_name in ('pacote_regulatorio', 'status_processamento');

select policyname
from pg_policies
where schemaname = 'public' and tablename = 'projetos';

select to_regprocedure(
  'public.criar_projeto_com_membro(text,text,text,text,text,text)'
);
```

O rollback operacional é restaurar o snapshot/backup. Não tente desfazer parcialmente as policies ou colunas em um banco com tráfego.

## Gate de integração isolado

O teste backend nunca lê `DATABASE_URL` como alvo. Ele exige `TEST_DATABASE_URL`, recusa o mesmo valor configurado em `DATABASE_URL` e faz o seguinte dentro de uma única transação:

- aplica apenas a `0015`, removendo os delimitadores internos `BEGIN`/`COMMIT`;
- assina JWTs HS256 de teste para dois UUIDs distintos;
- cria os usuários e um projeto temporários;
- prova o ciclo vazio → criar (`EMPTY`) → listar novamente;
- prova que o segundo usuário não lista nem abre o projeto;
- reverte usuários, projeto e mudanças de schema no final, mesmo após falha.

O banco descartável precisa ter as migrations base `0001` a `0014` e o schema `auth` nativo do Supabase ou o shim local `0000`. Nunca aponte esta variável para produção:

```powershell
$env:TEST_DATABASE_URL = "postgresql://usuario:senha@localhost:5432/concilia_integration"
& .\.venv\Scripts\python.exe -B -m pytest backend/tests/integration/test_empty_project_lifecycle.py -q
Remove-Item Env:TEST_DATABASE_URL
```

Sem `TEST_DATABASE_URL`, o caso de RLS retorna `SKIP` explícito; isso não constitui evidência de isolamento. Um release só promove a base depois de obter `PASS` com o banco descartável.

Execute também os gates locais:

```powershell
npm run test -- --run
npm run lint
npm run build
& .\.venv\Scripts\python.exe -B -m pytest backend/tests -q
```

## Implantação do backend

No Render/Railway ou serviço equivalente:

- fixe Python 3.11;
- instale com `pip install -r backend/requirements.txt`;
- inicie com `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`;
- configure todas as variáveis privadas no cofre do provedor;
- defina `APP_ENV=production` e uma lista explícita em `CORS_ORIGINS`;
- mantenha `/health` como health check e valide `/health/db` separadamente após a migration.

Não registre connection strings, JWTs, service-role keys ou chaves de OCR nos logs ou no repositório.

## Implantação do frontend

No Vercel ou serviço equivalente:

1. Instale com `npm ci` e gere o bundle com `npm run build`.
2. Configure somente as três variáveis públicas `VITE_*` descritas acima.
3. Garanta que `VITE_API_URL` aponte para o backend promovido e termine em `/api/v1`.
4. Configure o fallback SPA para `index.html` e teste login, logout, listagem vazia e criação.

O deploy está pronto para promoção somente quando o gate backend passar com RLS real e o gate frontend provar que o projeto reaparece após remontagem sem qualquer fallback de demonstração.
