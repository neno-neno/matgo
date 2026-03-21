# Deploy da MatGo

Este projeto hoje esta mais pronto para um deploy simples em:

- frontend no Vercel
- backend no Render

Esse caminho funciona bem para MVP, demonstracao e testes em dominio publico.

## Arquitetura recomendada

- `apps/web`: Vercel
- `apps/api`: Render
- banco atual: SQLite com disco persistente no Render

Observacao importante:

- SQLite serve para MVP e validacao
- para producao mais seria, o proximo passo natural e migrar para PostgreSQL

## 1. Subir o codigo para o GitHub

No projeto:

```bash
git status
git add .
git commit -m "Prepare MatGo for deployment"
git push
```

## 2. Backend no Render

O repositorio ja inclui um blueprint em `render.yaml`.

### Opcao A: via Blueprint

1. Crie uma conta no Render
2. Clique em `New +`
3. Escolha `Blueprint`
4. Conecte este repositorio
5. O Render vai ler `render.yaml`

### Opcao B: manual

Crie um `Web Service` com:

- Root Directory: `apps/api`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Adicione um `Persistent Disk`:

- Mount path: `/var/data`

Variaveis de ambiente:

- `MTD_ENVIRONMENT=production`
- `MTD_DATABASE_PATH=/var/data/matematica_todo_dia.db`
- `MTD_MASTER_ACCESS_CODE=MASTER-MAT-2026`

Depois que o frontend estiver no ar, atualize:

- `MTD_CORS_ORIGINS=["https://SEU-FRONTEND.vercel.app"]`

Teste:

- `https://SEU-BACKEND.onrender.com/api/health`
- `https://SEU-BACKEND.onrender.com/docs`

## 3. Frontend no Vercel

1. Crie uma conta no Vercel
2. Clique em `Add New...`
3. Escolha `Project`
4. Conecte este repositorio
5. Em `Root Directory`, selecione `apps/web`

Framework:

- Next.js

Variaveis de ambiente:

- `NEXT_PUBLIC_API_URL=https://SEU-BACKEND.onrender.com`
- `API_URL=https://SEU-BACKEND.onrender.com`

Depois do deploy:

- abra a URL gerada pelo Vercel
- teste login, loja, perfil e missao diaria

## 4. Ajuste final de CORS

Depois que o Vercel gerar o dominio do frontend:

1. volte ao Render
2. atualize a variavel:

```text
MTD_CORS_ORIGINS=["https://SEU-FRONTEND.vercel.app"]
```

3. salve e redeploye a API

Se tiver dominio proprio depois, troque para ele.

## 5. Ordem ideal de deploy

1. subir repositorio no GitHub
2. publicar backend no Render
3. pegar URL publica da API
4. publicar frontend no Vercel usando a URL da API
5. voltar no Render e ajustar o CORS com a URL final do frontend

## 6. O que ja esta pronto para esse deploy

- backend com start command compativel com Render
- frontend Next.js pronto para Vercel
- CORS com suporte a localhost e rede local
- blueprint inicial do Render em `render.yaml`
- configuracao de ambiente documentada

## 7. O que ainda e MVP

- SQLite ainda e local ao disco do Render
- nao ha PostgreSQL ainda
- nao ha storage externo para uploads
- nao ha dominio proprio configurado

## 8. Proximo passo depois do primeiro deploy

Depois da MatGo estar no ar, o ideal e:

1. migrar para PostgreSQL
2. configurar dominio proprio
3. criar ambiente de staging
4. habilitar monitoramento e logs mais fortes
