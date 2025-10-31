# Backup & Deploy (Drive + Postgres) — Instruções para Render

Este arquivo resume a configuração necessária para que os backups (relatórios + dump do Postgres) funcionem no ambiente do Render.

## Objetivo
- Garantir que `pg_dump` esteja disponível no ambiente para gerar dumps completos do PostgreSQL.
- Se `pg_dump` não estiver disponível, o código já implementa um fallback que exporta todas as tabelas do schema `public` em CSVs e cria um ZIP com `metadata.json`.
- Usar Secrets (Files) do Render para armazenar `service_account.json`, `client_secret.json` e `token.pickle` (quando aplicável).

---

## Build Command recomendado (Render)
No painel do Render, em Build & Deploy > Build Command, use (uma opção sem sudo):

```bash
apt-get update && apt-get install -y postgresql-client && pip install -r requirements.txt && python manage.py migrate
```

Se o ambiente do Render exigir `sudo` (raro no build), tente:

```bash
sudo apt-get update && sudo apt-get install -y postgresql-client && pip install -r requirements.txt && python manage.py migrate
```

Observações:
- A ordem `apt-get ... && pip install ...` garante que `pg_dump` seja instalado durante o build e esteja disponível no runtime.
- Verifique os logs do build — se `apt-get` falhar, o build também falhará.
- Alternativa robusta: criar um serviço com Docker (imagem customizada) que já contenha `pg_dump`. No Render isso exige criar um novo serviço selecionando Docker.

---

## Start command (não alterado)

- Command: `gunicorn fb.wsgi`

---

## Secrets / Files e Variáveis de Ambiente
Use o painel `Secrets` (Files) do Render para subir arquivos e configure as variáveis de ambiente abaixo apontando para `/etc/secrets/<filename>`.

Arquivos (Render > Secrets / Files):
- `service_account.json` (se usar service account)
- `client_secret.json` (se usar OAuth)
- `token.pickle` (se você gerou localmente com o fluxo OAuth — recomendado para contas pessoais)

Variáveis de ambiente (Env Vars):
- `DRIVE_REPORTS_FOLDER_ID` = ID da pasta no Drive para relatórios
- `DRIVE_DB_FOLDER_ID` = ID da pasta no Drive para dumps
- `DRIVE_BACKUP_FOLDER_ID` = (opcional) pasta genérica
- `GOOGLE_SERVICE_ACCOUNT_FILE` = /etc/secrets/service_account.json (se usar service account)
- `GOOGLE_OAUTH_CLIENT_SECRET_PATH` = /etc/secrets/client_secret.json (se usar OAuth)
- `TOKEN_PICKLE_PATH` = /etc/secrets/token.pickle (se usar OAuth e subiu token)

Observação: O código já verifica `/etc/secrets/...` automaticamente — essa é a forma recomendada.

---

## Como gerar `token.pickle` localmente (fluxo OAuth, conta pessoal)
1. No seu PC (venv ativado):

```powershell
cd C:\Users\Biel Silva\Desktop\Codes\fimiss\backend
.\venv\Scripts\Activate.ps1
python manage.py shell
```

2. No shell Django:

```python
from finance import drive_oauth_backup
drive_oauth_backup.get_drive_service()
```

3. Autorize no navegador quando abrir. O `token.pickle` será salvo em `backend/finance/token.pickle` (ou no caminho apontado por `TOKEN_PICKLE_PATH` se definido).
4. Faça upload do `token.pickle` para os Secrets Files do Render e defina `TOKEN_PICKLE_PATH=/etc/secrets/token.pickle`.

---

## Como testar no Render após o deploy
1. Abra o Web Shell (ou Console) do seu serviço no Render.
2. Checar se `pg_dump` existe:

```bash
which pg_dump
pg_dump --version
```

3. Rodar comando de teste do backup:

```bash
# testar backup completo
python manage.py run_drive_backup --type all
# testar só DB
python manage.py run_drive_backup --type db
# testar só relatórios
python manage.py run_drive_backup --type reports
```

4. Verifique no Google Drive se o arquivo `.dump` (quando `pg_dump` estiver presente) ou `.zip` (fallback) apareceu na pasta configurada.

---

## O que fazer se `apt-get` não funcionar no build
- Se o `apt-get` falhar no build do Render, o build mostra o erro nos logs. Sem `pg_dump`, o código usa o fallback CSV+ZIP (implementado) — portanto, os backups continuarão a existir, porém como CSVs, não como dump binário.
- Recomendação a médio prazo: usar uma imagem Docker customizada onde você instala `postgresql-client` e constrói exatamente o ambiente que precisa; isso exige criar um novo serviço no Render com Docker selecionado.

---

## Restauração / Recuperação
- Se você tiver um `.dump` (pg_dump custom), restaure com `pg_restore`:

```bash
pg_restore -h <host> -U <user> -d <dbname> -v <arquivo.dump>
```

- Se tiver o ZIP de fallback (CSV + metadata), será preciso recriar o schema em um banco vazio e importar os CSVs (por `psql` ou ferramentas). O `metadata.json` contém colunas e tipos para auxiliar.

---

## Segurança e limpeza antes de remover seu perfil
- Não coloque `service_account.json`, `client_secret.json` ou `token.pickle` no repositório.
- Garanta que `service_account.json` ou `token.pickle` estão salvos nos Secrets do Render.
- Se a chave do service account foi exposta no repo algum dia, rotacione-a no Google Cloud Console.

---

## Perguntas rápidas
- Quer que eu atualize o `README` no repo com mais detalhes (ex.: comandos para restaurar)? (Responda `sim` e eu adiciono.)

---

Arquivo gerado automaticamente pelo assistente — revise e comite para o repositório se estiver OK.
