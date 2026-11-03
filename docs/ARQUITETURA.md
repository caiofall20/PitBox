# Arquitetura

## Componentes
- **Frontend (React + Vite):** telas, câmera, editor de foto (girar/cortar), leitura OCR no aparelho.
- **Backend (Express):** autenticação JWT, perfis, CRUD da garagem, pastas, desejos, social, moderação.
- **PostgreSQL:** dados do sistema. Extensões `pg_trgm` (busca por nome parecido) e `vector` (pgvector, fase 2: reconhecimento visual).

## Scan (tudo gratuito)
1. **Verso da cartela:** Tesseract.js no aparelho → código do produto (ex.: JBB36), nome, série, nº. Chave principal: código do produto.
2. **Base do carrinho:** recorte automático + realce (`core/imageProcessing.js`) → PaddleOCR (PP-OCRv5) no aparelho → comparação aproximada com o catálogo (`pg_trgm` no servidor).
3. **Referência:** catálogo próprio; se não houver, Hot Wheels Wiki (API MediaWiki, com crédito). Link para Google Imagens como último recurso.
4. **Fase 2:** embeddings DINOv2 das fotos aprovadas em `catalog_photos.embedding` (pgvector) para reconhecer pela forma.

## Perfis
- **visitante (sem conta):** só lê `GET /api/social/{discover,search,users/:handle,items/:id,comments/...}` e só enxerga garagens com `garage_visible` e `follow_policy = 'publico'`. Qualquer ação (curtir, seguir, comentar, desejos, garagem própria, scan) abre o convite para criar conta.
- **colecionador:** garagem, pastas, desejos, social.
- **moderador:** aprova modelos e fotos enviados ao catálogo compartilhado.
- **admin:** tudo + gestão de usuários e perfis.

## Privacidade social
`users.follow_policy`: `publico` (segue direto), `aprovacao` (pedido), `ninguem`. `users.garage_visible` esconde a garagem.
