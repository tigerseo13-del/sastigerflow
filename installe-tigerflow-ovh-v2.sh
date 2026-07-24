#!/bin/bash
# ============================================================
#  TIGERFLOW — installation OVH v2 (à lancer UNE fois)
#  NE TOUCHE PAS au projet patrimoine (qui garde le lien principal).
#  TigerFlow aura SON lien à lui :  http://51.79.147.235:8080/
#  Et la synchro GitHub automatique toutes les 5 minutes.
# ============================================================
set -e

echo "[1/5] Installation de nginx + git (si pas deja la)…"
sudo apt-get update -y
sudo apt-get install -y nginx git

echo "[2/5] Recuperation de TigerFlow depuis GitHub…"
sudo rm -rf /var/www/tigerflow
sudo git clone https://github.com/tigerseo13-del/sastigerflow.git /var/www/tigerflow
sudo chown -R ubuntu:ubuntu /var/www/tigerflow

echo "[3/5] Site TigerFlow sur le port 8080 (patrimoine reste intact sur le port 80)…"
sudo tee /etc/nginx/sites-available/tigerflow > /dev/null <<'CFG'
server {
  listen 8080;
  listen [::]:8080;
  root /var/www/tigerflow;
  index dashboard.html index.html;
  location / { try_files $uri $uri/ =404; }
}
CFG
sudo ln -sf /etc/nginx/sites-available/tigerflow /etc/nginx/sites-enabled/tigerflow
sudo nginx -t
sudo systemctl reload nginx

echo "[4/5] Ouverture du port 8080 dans le pare-feu (si actif)…"
sudo ufw allow 8080/tcp 2>/dev/null || true
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT 2>/dev/null || true

echo "[5/5] Synchro automatique GitHub → serveur (toutes les 5 min)…"
echo '*/5 * * * * ubuntu cd /var/www/tigerflow && git pull --ff-only >/dev/null 2>&1' | sudo tee /etc/cron.d/tigerflow-sync > /dev/null

echo ""
echo "============================================================"
echo "  TIGERFLOW EN LIGNE  :  http://51.79.147.235:8080/"
echo "  PATRIMOINE intact   :  http://51.79.147.235/"
echo "  Commit sur GitHub -> TigerFlow se met a jour TOUT SEUL"
echo "============================================================"
