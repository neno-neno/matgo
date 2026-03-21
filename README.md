# Matematica Todo Dia

Plataforma educacional de matematica inspirada em experiencias gamificadas de alta retencao, com frontend em Next.js e backend em FastAPI.

## O que esta pronto

- Experiencia principal do aluno com trilhas, mapa por mundos, ranking, missoes, badges e loja
- Exercicios interativos com envio real para a API
- Painel do professor com visao de turmas, desempenho e focos de revisao
- API organizada por dominio, com payload consolidado de bootstrap para o frontend

## Estrutura

- `apps/web`: aplicacao Next.js
- `apps/api`: API FastAPI
- `infra/sql`: schema e seed inicial do banco

## O que esta em modo MVP de producao

- A plataforma ja sobe como web + API
- A API agora tem login local, sessao persistida e banco SQLite
- O frontend ainda nao consome todas as rotas administrativas novas
- Isso e suficiente para demonstracao, validacao comercial e entrega inicial no mesmo dia
