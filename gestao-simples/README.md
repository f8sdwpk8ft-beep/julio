# Gestão Simples

Painel de gestão (clientes, produtos, vendas e financeiro) em HTML/CSS/JS puro — sem backend, sem build, sem dependências. Os dados ficam salvos no navegador de quem estiver usando (`localStorage`).

Arquivos:
- `index.html` — estrutura da página
- `style.css` — estilos
- `app.js` — toda a lógica (cadastros, vendas, financeiro, dashboard)

## Como subir na Hostinger

### Opção 1 — Gerenciador de Arquivos (mais simples)

1. Entre no **hPanel** da Hostinger → **Gerenciador de Arquivos**.
2. Abra a pasta `public_html` (é a raiz do seu domínio).
   - Para ficar em `seudominio.com/gestao`, crie/entre na subpasta `gestao` dentro de `public_html` antes de continuar.
3. Envie os 3 arquivos desta pasta (`index.html`, `style.css`, `app.js`) — pode arrastar e soltar ou usar o botão de upload.
4. Acesse `https://seudominio.com` (ou `https://seudominio.com/gestao`, se usou subpasta) no navegador. Pronto.

### Opção 2 — FTP

1. No hPanel, pegue os dados de acesso FTP (host, usuário, senha, porta 21) em **Arquivos → Contas FTP**.
2. Conecte com um cliente FTP (FileZilla, WinSCP, ou o próprio Claude Code/terminal).
3. Envie os 3 arquivos para dentro de `public_html` (ou a subpasta desejada).

### Pelo Claude Code

Se quiser que eu faça o envio direto por FTP, me passe host, usuário e senha da conta FTP da Hostinger (nunca cole a senha em um lugar público) e eu preparo o comando de upload.

## Importante sobre os dados

Este site guarda tudo no `localStorage` do navegador — ou seja, os dados ficam só no aparelho/navegador de quem está usando, e não são compartilhados entre dispositivos nem entre pessoas diferentes. Isso significa:

- Limpar os dados do site/cache do navegador apaga os cadastros.
- Abrir em outro celular/computador começa do zero.
- Não há backup automático fora do navegador.

Se precisar que os dados fiquem centralizados (todo mundo vendo a mesma coisa, de qualquer aparelho), é necessário adicionar um banco de dados e um backend — nesse caso é só pedir para eu implementar antes de subir.
