# Guia Definitivo: Deploy do MatGo com Supabase

Este documento guia o passo a passo exato para realizar a publicação do projeto, migrando do SQLite local para o PostgreSQL online no Supabase, seguido pelos deploys do backend (FastAPI) e frontend (Next.js).

---

## 🚀 Passo 1: Configurar o Supabase (Banco de Dados)
A aplicação MatGo foi adaptada para rodar **nativamente** no PostgreSQL usando o Supabase.

1. Acesse [Supabase](https://supabase.com/) e crie um novo projeto (ex: `matgo-db`).
2. Anote com segurança a **senha do banco de dados** escolhida.
3. Vá em **Project Settings > Database**.
4. Procure a aba **Connection Pooler** e copie a sua URI de conexão (`Connection string`).
   - *Selecione o modo **Transaction**.*
   - *Ela será parecida com: `postgresql://postgres.[SEU_PROJETO]:[SENHA]@[REGIAO].pooler.supabase.com:6543/postgres`*
5. Vá na tela **SQL Editor** do Supabase.
6. Crie uma nova query, cole todo o conteúdo do arquivo localizado em `infra/sql/supabase_setup.sql` e clique em **RUN**.
7. Verifique o **Table Editor** no menu esquerdo. O banco já deve exibir as tabelas (`users`, `schools`, etc) e a tabela `app_settings` deve conter o `teacher_access_code`.

---

## 🚀 Passo 2: Deploy do Backend (FastAPI)
O backend pode ser publicado de forma gratuita/barata no Render, Railway ou Fly.io. A recomendação aqui é **Render**.

1. Crie uma conta no [Render](https://render.com/).
2. Conecte seu repositório GitHub e crie um novo **Web Service**.
3. Escolha o diretório principal da aplicação raiz.
4. Preencha as configurações do serviço:
   - **Root Directory**: `apps/api`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Variáveis de Ambiente (`Environment Variables`) a serem preenchidas:
   - `MTD_ENVIRONMENT`: `production`
   - `MTD_DATABASE_URL`: *(Cole a URL do Supabase Connection Pooler do Passo 1. Substitua `[SENHA]` pela sua senha).*
   - `MTD_CORS_ORIGINS`: `["http://localhost:3000", "https://seu-site-frontend.vercel.app"]`
   - `MTD_CORS_ORIGIN_REGEX`: `https://.*\.vercel\.app`
   - `MTD_MASTER_ACCESS_CODE`: `MASTER-MAT-2026` *(Ou sua senha secreta para mestres)*
6. Faça o Deploy. Após o sucesso, copie a URL gerada (ex: `https://matgo-api-abc.onrender.com`).

---

## 🚀 Passo 3: Deploy do Frontend (Next.js)
A Vercel é a plataforma mais indicada para hospedar o Next.js.

1. Crie uma conta na [Vercel](https://vercel.com) e adicione um novo projeto puxando deste seu repositório GitHub.
2. Na tela de importação, expanda as opções usando **Root Directory** e selecione `apps/web`.
3. Preencha as "Environment Variables" (`Variáveis de ambiente`):
   - `NEXT_PUBLIC_API_URL`: A URL **exata** do backend que você acabou de subir no Render (ex: `https://matgo-api-abc.onrender.com`). *Sem a barra "/" no final.*
   - `API_URL`: A mesma URL do passo anterior.
4. Clique em **Deploy**.
5. Quando o site subir, volte no painel do backend no Render e tenha certeza de que a URL Vercel recém-criada foi declarada dentro do `MTD_CORS_ORIGINS` para liberar os acessos.

---

## ✅ Checklist Final

- [ ] Banco de dados no Supabase criado e URI de Transaction copiada.
- [ ] Script `infra/sql/supabase_setup.sql` rodado sem erros no SQL Editor.
- [ ] Backend no ar via Render, contendo a variável `MTD_DATABASE_URL` corretamente preenchida com a conexão do Supabase.
- [ ] Frontend no ar via Vercel, contendo a variável `NEXT_PUBLIC_API_URL` apontando pro Render.
- [ ] Frontend consegue fazer chamadas sem erro de CORS. **Teste criando um pequeno cadastro de teste usando o Master Code ou tentando fazer login vazio.**

## 🔥 Sugestões para o Futuro Pós-MVP
1. Ativar o **Row Level Security (RLS)** nativo do Supabase caso decida usar os clientes Next.js acessando o banco diretamente. No formato atual, o FastAPI funciona como um escudo blindado de segurança para seus dados.
2. Escalar a instância FastAPI. No Render gratuito as conexões do banco podem hibernar. Usar um Cron-job temporário (`cron-job.org`) chamando `[URL_RENDER]/api/health` garantirá o FastAPI rodando ininterruptamente se desejar testes estáveis 24h.
