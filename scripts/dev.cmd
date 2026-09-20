@echo off
cd /d "%~dp0.."
call npx.cmd --yes serve -l 8140 --no-clipboard .
