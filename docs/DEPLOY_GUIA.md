# 🚀 Guia de Deploy em Staging / Nuvem (Supabase + Vercel / Render)

Este guia orienta o deploy completo da plataforma **Concilia Rouanet / SALIC & FSA** para disponibilizar a aplicação em produção ou homologação na internet.

---

## 🗄️ 1. Banco de Dados: Supabase (PostgreSQL 16 Gratuito)

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e crie um novo projeto (ex: `concilia-rouanet`).
2. No painel do Supabase, vá em **SQL Editor**.
3. Abra o arquivo [`backend/scripts/dump_supabase_schema.sql`](file:///c:/Users/Dell/Downloads/concilia-rouanet/backend/scripts/dump_supabase_schema.sql), copie todo o conteúdo e cole no SQL Editor do Supabase.
4. Clique em **RUN**.
   - Todas as 18 tabelas, funções, RLS policies e as 185 despesas reais do Projeto 1961 serão criadas instantaneamente.
5. Em **Project Settings > Database > Connection String**, copie a URI `postgresql://...` (modo Session ou Direct).
6. Em **Project Settings > API > JWT Settings**, copie o `JWT Secret`.

---

## 🚀 2. Backend FastAPI: Render ou Railway

1. Crie uma conta em [render.com](https://render.com).
2. Clique em **New > Web Service** e conecte seu repositório GitHub.
3. Configure:
   - **Root Directory:** `.`
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Em **Environment Variables**, adicione:
   - `DATABASE_URL`: `[Sua connection string do Supabase]`
   - `SUPABASE_JWT_SECRET`: `[Seu JWT Secret do Supabase]`
   - `GEMINI_API_KEY`: `[Sua chave do Google Gemini]`
5. Clique em **Deploy**. A API estará online com `/health` e `/docs`.

---

## 💻 3. Frontend React: Vercel

1. Crie uma conta em [vercel.com](https://vercel.com).
2. Importe o repositório GitHub do projeto.
3. A Vercel detectará automaticamente o **Vite**.
4. Em **Environment Variables**, adicione (se aplicável):
   - `VITE_API_URL`: `https://sua-api.onrender.com`
5. Clique em **Deploy**. Sua aplicação estará disponível em `https://concilia-rouanet.vercel.app`!
