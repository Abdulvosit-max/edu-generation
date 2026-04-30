#!/bin/bash
# PythonAnywhere Bash konsolida ishga tushiring:
# bash setup_pythonanywhere.sh YOUR_USERNAME YOUR_DB_PASSWORD

set -e

PA_USER="${1:-$(whoami)}"
DB_PASS="${2:-}"

if [ -z "$DB_PASS" ]; then
  echo "Foydalanish: bash setup_pythonanywhere.sh <username> <db_password>"
  exit 1
fi

echo "=== EduGen Backend Setup (PythonAnywhere) ==="
echo "Username: $PA_USER"

# 1. Reponi klonlash (agar mavjud bo'lmasa)
if [ ! -d "/home/$PA_USER/edu-generation" ]; then
  echo "[1/7] Reponi klonlash..."
  cd /home/$PA_USER
  git clone https://github.com/YOUR_GITHUB_USERNAME/edu-generation.git
else
  echo "[1/7] Reponi yangilash..."
  cd /home/$PA_USER/edu-generation
  git pull origin main
fi

cd /home/$PA_USER/edu-generation/backend

# 2. Virtual muhit
echo "[2/7] Virtual muhit yaratish..."
if [ ! -d "/home/$PA_USER/.virtualenvs/edu-gen" ]; then
  python3.10 -m venv /home/$PA_USER/.virtualenvs/edu-gen
fi
source /home/$PA_USER/.virtualenvs/edu-gen/bin/activate

# 3. Paketlarni o'rnatish
echo "[3/7] Python paketlarini o'rnatish..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

# 4. .env faylini yaratish
echo "[4/7] .env konfiguratsiyasi..."
cat > /home/$PA_USER/edu-generation/backend/.env << EOF
DJANGO_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
DJANGO_DEBUG=False
ALLOWED_HOSTS=$PA_USER.pythonanywhere.com

DB_ENGINE=mysql
DB_NAME=${PA_USER}\$edu_gen
DB_USER=$PA_USER
DB_PASSWORD=$DB_PASS
DB_HOST=$PA_USER.mysql.pythonanywhere-services.com
DB_PORT=3306

CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://edu-generation.vercel.app
EOF

echo ".env fayli yaratildi."

# 5. MySQL database tekshiruvi
echo "[5/7] MySQL ulanishini tekshirish..."
python3 -c "
import os
os.environ['DB_ENGINE'] = 'mysql'
os.environ['DB_NAME'] = '${PA_USER}\$edu_gen'
os.environ['DB_USER'] = '$PA_USER'
os.environ['DB_PASSWORD'] = '$DB_PASS'
os.environ['DB_HOST'] = '$PA_USER.mysql.pythonanywhere-services.com'
import MySQLdb
try:
    conn = MySQLdb.connect(host='$PA_USER.mysql.pythonanywhere-services.com', user='$PA_USER', password='$DB_PASS', database='${PA_USER}\$edu_gen')
    print('MySQL ulanish muvaffaqiyatli!')
    conn.close()
except Exception as e:
    print(f'MySQL xatolik: {e}')
    print('PythonAnywhere Dashboard > Databases dan edu_gen bazasini yarating.')
"

# 6. Migrations
echo "[6/7] Database migratsiyalari..."
python manage.py migrate --noinput

# 7. Static fayllar
echo "[7/7] Static fayllar to'plash..."
python manage.py collectstatic --noinput

echo ""
echo "=== Setup TUGADI ==="
echo ""
echo "Endi PythonAnywhere Dashboard > Web > Add new web app:"
echo "  Manual configuration > Python 3.10"
echo "  Source code: /home/$PA_USER/edu-generation/backend"
echo "  Virtualenv: /home/$PA_USER/.virtualenvs/edu-gen"
echo ""
echo "WSGI faylini quyidagi kontent bilan to'ldiring:"
echo "----------------------------------------------"
cat << 'WSGI'
import sys
import os
from dotenv import load_dotenv

project_path = '/home/YOUR_USERNAME/edu-generation/backend'
sys.path.insert(0, project_path)
load_dotenv(os.path.join(project_path, '.env'))
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'

from core.wsgi import application
WSGI
echo "----------------------------------------------"
echo "YOUR_USERNAME o'rniga: $PA_USER"
