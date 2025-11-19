# Restauration d'un backup (sans compression)
#psql_path = "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe"
#subprocess.run([psql_path, "-U", postgres_user, "-f", backup_filepath])

# Restauration d'un backup compressé
import gzip
with gzip.open(backup_filepath, 'rb') as f_in:
    subprocess.run([psql_path, "-U", postgres_user], stdin=f_in)