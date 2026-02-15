#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 22

cd /mnt/c/Users/user/vocal-class-cloudflare

codex --full-auto "$1"
