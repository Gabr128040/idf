"""
Simple CLI to interact with the backend monitoring and backup endpoints.
Usage:
  Set environment variables:
    BACKEND_URL - e.g. https://idf-docker-version.onrender.com
    TOKEN - JWT access token (optional, required for protected endpoints)

Examples:
  python backend_cli.py health
  python backend_cli.py info
  python backend_cli.py backup --type db
  python backend_cli.py list-backups
"""
import os
import sys
import requests
import argparse

BACKEND_URL = os.environ.get('BACKEND_URL') or os.environ.get('REACT_APP_API_URL')
TOKEN = os.environ.get('TOKEN')

HEADERS = {}
if TOKEN:
    HEADERS['Authorization'] = f'Bearer {TOKEN}'


def call(path, method='get', json=None):
    url = f"{BACKEND_URL.rstrip('/')}/api/{path.lstrip('/') }"
    try:
        if method.lower() == 'get':
            r = requests.get(url, headers=HEADERS, timeout=30)
        else:
            r = requests.post(url, json=json, headers=HEADERS, timeout=60)
        print(r.status_code)
        try:
            print(r.json())
        except Exception:
            print(r.text)
    except Exception as e:
        print('Request failed:', e)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['health','info','check-db','backup','list-backups'])
    parser.add_argument('--type', default='all', help='backup type: all|db|reports|sqlite')
    args = parser.parse_args()

    if not BACKEND_URL:
        print('BACKEND_URL not set. export BACKEND_URL=https://...')
        sys.exit(1)

    if args.action == 'health':
        call('health/')
    elif args.action == 'info':
        call('backend/info/')
    elif args.action == 'check-db':
        call('check-db-status/')
    elif args.action == 'backup':
        # Requires auth
        call('backup/run/', method='post', json={'target': args.type})
    elif args.action == 'list-backups':
        call('backup/list/')

if __name__ == '__main__':
    main()
