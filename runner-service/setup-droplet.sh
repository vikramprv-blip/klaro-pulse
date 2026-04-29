#!/bin/bash
# Run this on your DigitalOcean droplet after SSH
# ssh root@YOUR_DROPLET_IP then paste this whole block

apt-get update -y
apt-get install -y docker.io docker-compose curl git

systemctl enable docker
systemctl start docker

mkdir -p /opt/klaro-pulse-runner
cd /opt/klaro-pulse-runner

cat > docker-compose.yml << 'COMPOSE'
version: '3.8'
services:
  pulse-runner:
    image: klaro-pulse-runner:latest
    restart: always
    environment:
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - GROQ_API_KEY=${GROQ_API_KEY}
    shm_size: '2gb'
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
COMPOSE

echo "Setup complete. Now copy your .env file and run: docker-compose up -d"
