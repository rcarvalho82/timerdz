# Como trabalhamos (guia interno)

1. **Nunca trabalhe direto na `main`.** Crie um ramo por mudança (ex.: `ajuste-fontes`), faça commits pequenos e abra um *pull request*. O outro revisa e aprova antes de entrar.
2. **Testes:** rode `npm test` antes de enviar. O GitHub também roda os testes a cada envio. Mudou a lógica do relógio, dos lembretes, da recuperação ou do armazenamento (`src/core/`)? **Inclua ou ajuste um teste.**
3. **Estrutura:** regras de negócio ficam em `src/core/` (sem acesso à tela). A interface (`src/renderer/`) só desenha e chama o núcleo. Não duplique regra de relógio na interface.
4. **Interface:** não há testes automáticos. Mudanças visuais ou de comportamento devem ser conferidas com o `TESTE-MANUAL.md` (ao menos os itens afetados).
5. **Não suba:** `node_modules`, `dist`, dados reais de eventos, senhas, chaves ou certificados (futuro certificado de assinatura vai como segredo do GitHub, nunca no código).
6. **Mensagens de commit:** curtas e no imperativo, em português (ex.: "Reduz fonte dos avisos").
7. **Formato de exportação** (`cronometro-cronograma`, versão 1): se mudar, aumente a versão e mantenha leitura das anteriores.
