import sys
import os

sys.path.append(os.getcwd())

import psycopg
from app.config import settings

def main():
    if not settings.database_url:
        print("ERRO: MTD_DATABASE_URL nao foi encontrada no arquivo .env.")
        sys.exit(1)
    
    print(f"Tentando conectar em: {settings.database_url.split('@')[-1]}")
    try:
        with psycopg.connect(settings.database_url) as conn:
            cur = conn.cursor()
            cur.execute("SELECT version();")
            version = cur.fetchone()[0]
            print("\nSUCESSO! Conexao estabelecida com o Supabase.")
            print(f"Versao do BD: {version}")
                
            cur = conn.cursor()
            cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
            count = cur.fetchone()[0]
            print(f"Tabelas no schema public: {count} tabelas.")
            
            if count == 0:
                print("-> Nenhuma tabela encontrada. Lembre-se de rodar o arquivo infra/sql/supabase_setup.sql no SQL Editor do Supabase!")
            else:
                print("-> Tabelas prontas!")
    except Exception as e:
        print(f"\nFALHA NA CONEXAO: {e}")
        print("Verifique se a senha no arquivo .env esta correta (ela nao deve conter os colchetes []) e se você colou a URL certa do 'Transaction'")
        sys.exit(1)

if __name__ == "__main__":
    main()
