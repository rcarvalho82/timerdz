# timerdz

Aplicativo local para Windows 11: relógios independentes por etapa, lembretes com alerta sonoro e visual, cronogramas reutilizáveis e recuperação de sessão. Funciona 100% offline, sem conta, sem telemetria, sem nuvem.

> **Estado desta versão:** a lógica (relógio, lembretes, recuperação, armazenamento, importação) tem testes automatizados que passaram. A interface e o instalador **ainda não foram executados em Windows** por quem os escreveu. Siga `TESTE-MANUAL.md` na primeira vez.

## 1. Gerar o instalador (uma única vez)
Requer um Windows com internet **somente nesta etapa**.
1. Instale o Node.js, versão LTS: https://nodejs.org (próximo, próximo, concluir).
2. Dê dois cliques em **`gerar-instalador.bat`**. Ele instala as dependências, roda os testes e gera o instalador.
3. Ao terminar, o arquivo `.exe` estará na pasta **`dist`**.

Se algo falhar, copie a mensagem de erro exibida na janela e envie para quem está dando suporte. Versões de pacote em `package.json` foram escolhidas sem que eu pudesse baixá-las; um ajuste de versão pode ser necessário.

## 2. Instalar e usar
- Execute o `.exe` de `dist`. A instalação é por usuário e não pede administrador. Depois disso o app **não precisa de internet nem do Node.js**.
- Abra pelo atalho criado. Na primeira vez há um cronograma de demonstração na biblioteca.

**Fluxo:** Biblioteca → Carregar (nome da sessão) → Iniciar etapa → … → Próxima etapa (confirma e deixa o relógio parado) → Iniciar etapa.

**Atalhos** (não funcionam enquanto você digita em um campo):
Espaço iniciar/pausar · M silenciar · ← → ajustar −1/+1 min · N próxima etapa · Ctrl+Shift+R reiniciar (com confirmação).

## 3. Atualizar
Gere um novo instalador e execute-o por cima do anterior. Seus cronogramas e preferências são mantidos.

## 4. Desinstalar
Configurações do Windows → Aplicativos → timerdz → Desinstalar. **Seus dados não são apagados** na desinstalação (ficam em `%APPDATA%`, em uma pasta com o nome do app, subpasta `dados`). Para removê-los, apague essa pasta manualmente.

## 5. Backup e restauração
- **Backup:** na Biblioteca, clique em **Exportar** em cada cronograma e guarde os arquivos `.json`. (Não há “exportar todos” nesta versão.)
- **Restauração:** Biblioteca → **Importar** → escolha o `.json`. Nada existente é sobrescrito: se o nome já existir, o importado ganha “(importado)”.
- Arquivos inválidos são recusados com uma explicação, sem alterar seus dados.

## 6. Limites honestos
- Alertas **não** tocam com o computador suspenso ou desligado. Ao voltar, a sessão pode ser recuperada pelo tempo real, **sem** repetir alertas passados.
- Não há importação de planilhas Excel nesta versão.
- A edição de lembretes da sessão em andamento não existe (edite o modelo e carregue de novo).

## 7. Problemas comuns ao gerar o instalador
- **"No matching version found"**: uma versão em `package.json` não existe. Avise quem dá suporte.
- **Avisos "deprecated"**: são só avisos, ignore.
- **`ERR_SSL_CIPHER_OPERATION_FAILED`** (ou erros de rede/SSL durante o download): o download foi corrompido. Tente, nesta ordem:
  1. Executar o `gerar-instalador.bat` de novo (o script já tenta duas vezes, mais devagar).
  2. Desativar temporariamente VPN e antivírus com "proteção web" e tentar de novo.
  3. Trocar de rede (por exemplo, o roteamento do celular) ou usar cabo em vez de Wi-Fi.
  4. Atualizar o Node.js para a versão LTS mais recente em https://nodejs.org.
  5. Erro "Cannot create symbolic link / O cliente não tem o privilégio necessário" (winCodeSign): já tratado em `package.json` (`signAndEditExecutable: false`). Se aparecer de novo, ative Configurações → Sistema → Para desenvolvedores → Modo de Desenvolvedor, ou execute o .bat como administrador.
- **"14 vulnerabilities" no final do npm install:** referem-se às ferramentas de build, não ao app instalado. Não rode `npm audit fix --force`, pois pode quebrar o build.

## 8. Ícone do aplicativo
O ícone fica em `build/` (`icon.ico` e `icon.png`). Ele já aparece na janela e na barra de tarefas. Para que também apareça no arquivo `.exe`, ative o Modo de Desenvolvedor do Windows e, em `package.json`, troque `"signAndEditExecutable": false` por `true` antes de gerar o instalador.
