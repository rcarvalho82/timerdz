# timerdz

Projeto interno e privado (nome provisório). Cronômetro local para Windows 11, com relógios independentes por etapa, lembretes sonoros e visuais, cronogramas reutilizáveis e recuperação de sessão. Funciona offline, sem conta e sem nuvem.

> Código proprietário. Veja `LICENSE` (provisório). Não distribuir.

## Para quem vai desenvolver
```
npm install      # instala dependências (uma vez)
npm test         # testes automatizados da lógica (não precisa do Electron)
npm start        # abre o app em modo de desenvolvimento
```
Gerar o instalador no Windows: dois cliques em `gerar-instalador.bat` (resultado em `dist/`).

## Documentos
- `INSTALACAO.md`: instalar, atualizar, desinstalar, backup e problemas comuns de build.
- `DOCUMENTACAO-TECNICA.md`: arquitetura, decisões e o que foi ou não verificado.
- `TESTE-MANUAL.md`: roteiro de teste da interface (não há testes automáticos de interface).
- `CONTRIBUTING.md`: como trabalhamos em dupla.

## Pendências conhecidas
Idioma Português/Inglês · exportar/importar todos os cronogramas · ícone dentro do `.exe` (ver `INSTALACAO.md`, seção 8) · abas de cronogramas · geração automática do instalador · nome, licença e titularidade definitivos.
