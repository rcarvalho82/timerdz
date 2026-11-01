# Roteiro de teste manual (cerca de 40 min)

Faça na ordem. Anote o que falhar (mensagem na tela, o que você clicou). Para testes rápidos, crie na Biblioteca um cronograma **“Teste rápido”** com 2 etapas: Etapa A (início 0, duração 2 min, lembretes nos minutos 0, 1 e 2) e Etapa B (início 10, sem duração, lembrete no 11).

## A. Abertura e janela
1. `npm start` (ou instale o `.exe`): a janela abre e mostra a Biblioteca com a demonstração. **Se abrir em branco ou os botões não responderem, pare e reporte** (provável problema de carga do núcleo ou da política de segurança).
2. Redimensione, mova a janela, feche e reabra: tamanho e posição são lembrados.
3. Janela pequena (arraste até ~420×320): o relógio e o lembrete atual continuam legíveis; elementos secundários somem; sem sobreposição.

## B. Relógio e etapas (use o “Teste rápido”)
4. Carregar → o relógio fica **parado**, etapa **PREPARADA**.
5. Iniciar etapa: o lembrete do minuto 0 aparece e soa imediatamente. Aos 1:00 e 2:00 os seguintes soam; aos 2:00 também o **som de fim** (uma vez só) e surge “Duração prevista ultrapassada”, o relógio segue contando e o aviso fica até avançar.
6. Pausar: o relógio congela; espere 1 min; Continuar retoma do mesmo valor, sem lembretes repetidos.
7. Reiniciar: pede confirmação; ao confirmar, volta ao valor inicial, parado.
8. Próxima etapa: pede confirmação; Etapa B aparece em **10:00, parada**; só inicia ao clicar de novo. O excedente da A não aparece na B.

## C. Ajustes e lembretes
9. Com o relógio rodando na Etapa A (minuto 0), clique **+1** quando estiver em 0:30: vai a 1:30 e o lembrete do minuto 1 **não** dispara. Clique **−1** duas vezes e deixe passar de novo pelo minuto 1: ele dispara.
10. Teste o campo “min” personalizado (valores positivos e negativos).
11. Atalhos: Espaço, M, ← →, N, Ctrl+Shift+R. Digitando no campo “min”, o Espaço **não** deve pausar.

## D. Som e aparência
12. Silenciar (botão e M): o texto muda para SILENCIADO e nenhum som toca. Volume em Configurações.
13. Tema: Seguir o Windows / Claro / Escuro; reabra o app e confira que ficou salvo.
14. A cor do painel de lembretes vai de verde a vermelho ao se aproximar do próximo lembrete e volta a verde no seguinte.
15. **Segundo plano:** inicie o Teste rápido, minimize o app e espere os lembretes de 1:00 e 2:00: devem soar com a janela minimizada.

## E. Recuperação
16. Com relógio rodando, feche pela janela: aparece confirmação. Confirme e reabra: o app **pergunta** se quer Recuperar ou Descartar. Recuperar mostra o valor correto pelo tempo real, **sem sons retroativos**.
17. Repita finalizando o app pelo Gerenciador de Tarefas (encerramento inesperado).
18. Com relógio **pausado**, feche e recupere: continua pausado no mesmo valor.
19. Carregue um cronograma e **não** inicie; feche e reabra: **não** deve oferecer recuperação.

## F. Biblioteca e editor
20. Criar, renomear, duplicar, excluir (com confirmação).
21. No editor: adicionar/excluir/reordenar etapas; alterar valor inicial, sentido e critério de fim (veja o texto explicativo); adicionar lembretes com Enter; mudar um minuto e ver a lista reordenar; setas ↑↓ para ordem manual.
22. Salvamento automático (“Salvo às …”) e botão Salvar. Digite um valor inválido (ex.: duração vazia) e veja a mensagem de erro sem perder o restante.
23. Editar um modelo enquanto outra sessão estava carregada não altera a sessão (carregue, volte à biblioteca só após encerrar; edite; carregue de novo e compare).

## G. Importar/exportar
24. Exporte um cronograma, importe-o: aparece “(importado)”. Edite o `.json` quebrando-o de propósito: a importação é recusada com mensagem e nada muda.

## H. Offline
25. Desligue a internet e repita B e E: tudo deve funcionar igual.
26. Confira onde ficaram os dados (`%APPDATA%`, pasta do app, `dados`) e anote o caminho.
