# Documentação técnica

## Arquitetura
Electron (processo principal + janela web local), JavaScript puro, **sem etapa de compilação** e sem dependências em tempo de execução. Escolhido por: controle de timers/áudio em segundo plano, instalador único offline, janela com estado lembrado.

```
src/core/engine.js   Relógio, lembretes, etapas, recuperação, validação/importação (puro, testado)
src/core/storage.js  Persistência em JSON (gravação atômica), preferências, janela, sessão, fitBounds
src/core/demo.js     Cronograma de demonstração
src/main/main.js     Janela, IPC, confirmação ao fechar, instância única, sem menu padrão
src/main/preload.js  Ponte segura (contextIsolation, sandbox)
src/renderer/        Interface: app.js (sessão), library.js, editor.js, index.html, style.css
test/                Testes automatizados (node --test)
```

## Decisões principais
- **Tempo:** o relógio guarda valor-base e instante de início e calcula pela diferença de `Date.now()`; sem contagem de ticks, sem deriva. O `setInterval` (250 ms) só atualiza a tela e avalia lembretes. A lógica recebe o “agora” como parâmetro.
- **Lembretes:** disparam quando o relógio **cruza** o minuto programado (intervalo aberto→fechado). Ajuste manual reposiciona sem avaliar; ao retroceder e cruzar de novo, dispara de novo. Lembrete no valor inicial dispara na primeira partida.
- **Etapas:** cada uma tem relógio próprio; avançar prepara a seguinte **parada**, no valor inicial, zerando o alerta de fim. Nada é herdado.
- **Fim previsto:** valor final explícito tem prioridade sobre duração; alerta único por etapa; indicador visual persiste até avançar; a contagem continua.
- **Recuperação:** a cada 2 s e a cada ação a sessão é gravada. Na abertura, o app sempre pergunta. A posição é recalculada pelo tempo real; nenhum evento sonoro retroativo é gerado. Pausado permanece pausado; sessão nunca iniciada não é recuperável.
- **Sessão independente:** a sessão copia o cronograma ao ser criada.
- **Dados:** `%APPDATA%/<app>/dados/` — `cronogramas/*.json`, `preferencias.json`, `janela.json`, `sessao-ativa.json`. Gravação em arquivo temporário + renomeação. Arquivos corrompidos são ignorados.
- **Formato de exportação** (versão 1): `{ "format": "cronometro-cronograma", "version": 1, "schedule": { "name", "stages": [ { "name", "startValue", "direction": "up|down", "durationMin|null", "endValue|null", "reminders": [ { "id", "minute", "text" } ] } ] } }`. Valores são validados antes de gravar.
- **Som:** sintetizado com Web Audio (sem arquivos externos). **Segurança:** CSP restritiva, sem acesso a Node na interface, sem chamadas de rede.

## Estado de verificação
| Item | Situação |
|---|---|
| Lógica do relógio, lembretes, recuperação, importação (14 testes) | **Executado, passou** |
| Armazenamento, preferências, fitBounds, demonstração (9 testes) | **Executado, passou** |
| Sintaxe de todos os arquivos | **Verificada** |
| Execução do Electron, interface, som, atalhos, redimensionamento, fechamento | **Não executado** (roteiro em `TESTE-MANUAL.md`) |
| Testes automatizados de interface exigidos pelo briefing | **Não implementados** (exigem Electron/janela real) |
| Instalador `.exe`, instalação, funcionamento offline instalado | **Não gerado nem testado** |
| Versões de `electron` e `electron-builder` | Escolhidas de memória; podem precisar de ajuste |

## Limitações conhecidas
Sem “exportar todos”; valor inicial de sessão só ajustável por botões de ±minutos enquanto a etapa está PREPARADA; alertas não tocam com o PC suspenso.
