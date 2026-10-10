# Impulso Seguidores

Página de vendas de seguidores para Instagram com pagamento via PIX e painel de pedidos.

- Site: https://impulso-seguidores.vercel.app
- Painel: https://impulso-seguidores.vercel.app/admin

## Estrutura

| Caminho | O que faz |
|---|---|
| `public/index.html` | Página de vendas: pacotes, formulário, QR code PIX e envio do comprovante pelo WhatsApp |
| `public/admin.html` | Painel de vendas com login por senha |
| `api/pedido.js` | Registra um pedido novo (o valor é recalculado no servidor) |
| `api/admin/pedidos.js` | Lista os pedidos (exige senha) |
| `api/admin/status.js` | Altera o status de um pedido (exige senha) |
| `api/_lib.js` | Preços, acesso ao armazenamento e checagem de senha |

## Configuração

Preços: `PACOTES` em `api/_lib.js` e em `public/index.html` (mantenha os dois iguais).
Chave PIX, nome do recebedor e WhatsApp: objeto `CONFIG` em `public/index.html`.

Variáveis de ambiente na Vercel (não ficam no repositório):

- `ADMIN_PASSWORD`: senha do painel
- `BLOB_READ_WRITE_TOKEN`: criada ao conectar o Blob store `impulso-pedidos` ao projeto
