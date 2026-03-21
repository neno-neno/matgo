# Matematica Todo Dia

Plataforma educacional de matematica inspirada em experiencias gamificadas de alta retencao, com frontend em Next.js e backend em FastAPI.

## O que esta pronto

- Experiencia principal do aluno com trilhas, mapa por mundos, ranking, missoes, badges e loja
- Exercicios interativos com envio real para a API e feedback do tutor inteligente
- Painel do professor com visao de turmas, desempenho e focos de revisao
- API organizada por dominio, com payload consolidado de bootstrap para o frontend
- Modelagem SQL inicial para evolucao com PostgreSQL

## Estrutura

- `apps/web`: aplicacao Next.js
- `apps/api`: API FastAPI
- `infra/sql`: schema e seed inicial do banco

## Requisitos

- Node.js 20+
- Python 3.11+

## Como rodar localmente

### 1. Frontend

```bash
npm install
copy apps\web\.env.local.example apps\web\.env.local
npm run dev:web
```

Frontend em [http://localhost:3000](http://localhost:3000).

### 2. Backend

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --reload
```

API em [http://127.0.0.1:8000](http://127.0.0.1:8000) e docs em [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 3. Banco opcional com Docker

```bash
docker compose up -d
```

O app atual roda com dados em memoria, mas o schema e o seed inicial ja estao preparados para a persistencia em PostgreSQL.

## Endpoints principais

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/bootstrap`
- `GET /api/dashboard`
- `GET /api/learning-paths`
- `GET /api/world-map`
- `GET /api/battles`
- `GET /api/teacher/dashboard`
- `GET /api/teacher/classes`
- `GET /api/teacher/students`
- `GET /api/teacher/access-logins`
- `GET /api/teacher/classes/{class_id}/ranking`
- `GET /api/teacher/classes/{class_id}/report`
- `GET /api/students/{student_id}/report`
- `GET /api/master/teachers`
- `GET /api/master/teachers/{teacher_id}/students`
- `GET /api/forum/topics`
- `GET /api/forum/topics/{topic_id}`
- `POST /api/forum/topics`
- `POST /api/forum/topics/{topic_id}/posts`
- `POST /api/exercise-attempt`

## Acessos iniciais para teste

- Master:
  - email: `master@matematica.local`
  - senha: `Master@123`
- Professor:
  - email: `carla@matematica.local`
  - senha: `Professor@123`
- Professor 2:
  - email: `ricardo@matematica.local`
  - senha: `Professor@123`
- Aluno:
  - email: `ana@matematica.local`
  - senha: `Aluno@123`

## Teste rapido da camada administrativa

1. Faça login em `POST /api/auth/login`
2. Copie o `token`
3. Use `Authorization: Bearer SEU_TOKEN`
4. Teste:
   - `GET /api/teacher/classes`
   - `GET /api/teacher/access-logins`
   - `GET /api/teacher/classes/class-001/ranking`
   - `GET /api/teacher/classes/class-001/report`
   - `GET /api/students/student-001/report`
   - `GET /api/forum/topics`
   - `GET /api/master/teachers`

## Banco de dados local

- A API agora persiste dados em SQLite local
- Caminho padrao: `apps/api/data/matematica_todo_dia.db`
- O schema local e inicializado automaticamente no startup da API
- O schema PostgreSQL de referencia continua em `infra/sql/schema.sql`

## Fluxo funcional atual

1. O frontend busca `GET /api/bootstrap` na inicializacao.
2. A tela monta dashboard, mapa, trilhas, batalhas e painel docente a partir da API.
3. O envio de exercicios usa `POST /api/exercise-attempt`.
4. A resposta do tutor atualiza XP, moedas e vidas na interface.

## Publicar hoje com Docker

Se voce tiver Docker Desktop instalado, este e o caminho mais rapido para deixar a plataforma no ar no seu computador hoje:

```bash
docker compose -f docker-compose.prod.yml up --build
```

Depois acesse:

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:8000/docs](http://localhost:8000/docs)

Arquivos de deploy rapido:

- `docker-compose.prod.yml`
- `apps/web/Dockerfile`
- `apps/api/Dockerfile`

## Deploy recomendado hoje

Para colocar a MatGo em uma URL publica com o menor atrito agora:

- frontend no Vercel
- backend no Render

Guia rapido:

- veja [DEPLOY.md](C:/Users/tnett/OneDrive/Desktop/ESTUDO%20PROGRAMAÇÃO/NEW%20PLAT/DEPLOY.md)
- blueprint do backend: [render.yaml](C:/Users/tnett/OneDrive/Desktop/ESTUDO%20PROGRAMAÇÃO/NEW%20PLAT/render.yaml)

## O que esta em modo MVP de producao

- A plataforma ja sobe como web + API
- A API agora tem login local, sessao persistida e banco SQLite
- O frontend ainda nao consome todas as rotas administrativas novas
- Isso e suficiente para demonstracao, validacao comercial e entrega inicial no mesmo dia

## Proximos passos naturais

- Persistir usuarios, tentativas e progresso no PostgreSQL
- Adicionar autenticacao JWT
- Implementar batalhas em tempo real
- Criar authoring de conteudo para professores
