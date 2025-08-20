#!/usr/bin/env bash
# Script is already in backend folder when executed by Render
npm install
npm run build || echo "No build script found, skipping..."