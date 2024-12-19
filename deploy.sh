#!/bin/bash

echo "Pulling"
git pull

# Generate a secure random string for SESSION_SECRET
SESSION_SECRET=$(openssl rand -base64 32)

echo "Building application"
SESSION_SECRET=$SESSION_SECRET docker-compose up -d --build