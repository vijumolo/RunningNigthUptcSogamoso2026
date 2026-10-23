@echo off
title Running Night UPTC 2026 - Servidor local
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servir.ps1"
pause
