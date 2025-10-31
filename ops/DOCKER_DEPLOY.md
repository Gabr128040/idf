# Deploy usando Docker no Render

Este documento descreve os passos mínimos para migrar o backend para um serviço Docker no Render. Você precisa criar um novo serviço no painel do Render e apontar para o branch `backend` do repositório.

## Por que usar Docker?
- Permite instalar `postgresql-client` (pg_dump) no ambiente de runtime/build sem depender das restrições do buildpack do Render.
- Garante ambiente reprodutível.

## Arquivos relevantes
- `backend/Dockerfile` — Dockerfile para construir a imagem do backend.
- `backend/ops/BACKUP_README.md` — instruções adicionais sobre backups.

## Criando o serviço Docker no Render
1. No Render Dashboard clique em "New +" → "Web Service".
2. Selecione a opção "Docker" (ou "I will deploy a Docker container").
3. Conecte ao repositório GitHub e selecione o branch `backend`.
4. No campo "Dockerfile Path" coloque: `/backend/Dockerfile` (ou `Dockerfile` se estiver na raiz do repo dependendo de como você organizou).
5. Configure as Environment Variables (mesmas que você já configurou):
   - `DRIVE_REPORTS_FOLDER_ID`, `DRIVE_DB_FOLDER_ID`, `DRIVE_BACKUP_FOLDER_ID`, etc.
   - `GOOGLE_OAUTH_CLIENT_SECRET_PATH` = `/etc/secrets/client_secret.json` (se usar OAuth)
   - `TOKEN_PICKLE_PATH` = `/etc/secrets/token.pickle` (se for usar token)
   - `GOOGLE_SERVICE_ACCOUNT_FILE` = `/etc/secrets/service_account.json` (se usar service account)
6. Faça upload dos files (Render > Secrets / Files): `service_account.json`, `client_secret.json`, `token.pickle` (se gerado). No container, esses arquivos estarão em `/etc/secrets/`.

## Build & Deploy
- O Render vai construir a imagem baseando-se no `Dockerfile`. A instalação do `postgresql-client` acontece dentro do Dockerfile durante o build.
- Logs do build aparecerão no painel do Render.

## Testar localmente (opcional)
Se quiser testar a imagem localmente (precisa Docker instalado):

```bash
# na raiz do repositório
cd backend
# build (tag opcional)
docker build -t fimiss-backend:local .
# rodar (montando variáveis e secrets locais)
# Exemplo: montando .env e um diretorio com secrets
docker run -it --rm -p 8000:8000 \
  -e DATABASE_URL='postgres://user:pass@host:5432/db' \
  -e DRIVE_REPORTS_FOLDER_ID='xxx' \
  -v /path/to/local/secrets:/etc/secrets:ro \
  fimiss-backend:local

# Depois acesse http://localhost:8000
```

## Observações
- Caso sua aplicação precise de variáveis adicionais (SECRET_KEY, ALLOWED_HOSTS, etc.) configure no painel do Render.
- Se preferir rodar backups em jobs agendados, crie um Background Worker/Job no Render apontando para a mesma imagem e definindo o comando `python manage.py run_drive_backup --type db`.

---

Se quiser, eu crio também um `docker-compose.yml` mínimo para testes locais com um PostgreSQL container (útil para validar restauração/importação). Quer que eu adicione?