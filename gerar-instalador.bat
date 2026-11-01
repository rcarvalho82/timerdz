@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Gerador do instalador (precisa de internet apenas nesta etapa) ===
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale a versao LTS em https://nodejs.org e execute este arquivo de novo.
  pause & exit /b 1
)
call npm install --maxsockets=1 --fetch-retries=5 --fetch-retry-mintimeout=20000
if errorlevel 1 (
  echo Falha no download. Limpando o cache e tentando mais uma vez...
  call npm cache clean --force
  call npm install --maxsockets=1 --fetch-retries=5 --fetch-retry-mintimeout=20000
  if errorlevel 1 (
    echo Falha ao instalar dependencias. Veja as dicas no INSTALACAO.md ^(secao Problemas comuns^).
    pause & exit /b 1
  )
)
call npm test
if errorlevel 1 ( echo Os testes falharam. O instalador NAO foi gerado. & pause & exit /b 1 )
call npm run dist
if errorlevel 1 ( echo Falha ao gerar o instalador. & pause & exit /b 1 )
echo.
echo Pronto. O instalador esta na pasta "dist".
pause
