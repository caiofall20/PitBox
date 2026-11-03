# Telas

Referência: `design-reference/Pitbox.dc.html` (abrir no navegador; temas trocáveis pelo painel).

| Tela | Arquivo | Comportamento principal |
|---|---|---|
| Login | pages/Login.jsx | Entrar / Criar conta, mostrar senha, animação de largada |
| Início | pages/Home.jsx | Resumo, recentes, atalhos para escanear e verificar |
| Garagem | pages/Garagem.jsx | Busca, pastas (criar/excluir/filtrar), marca, escala, ordenação, badge ×N |
| Detalhe | pages/Detalhe.jsx | Ficha, pasta, unidades (−/+), preço médio, editar, excluir |
| Escanear | pages/Escanear.jsx | Na cartela: câmera ao vivo ou foto do verso → foto da garagem → conferir. Fora da cartela: foto lateral → base → até 3 candidatos lado a lado (catálogo / Wiki) ou manual |
| Editor de foto | components/EditorFoto.jsx | Auto-endireitar, girar 90°, cortar livre/16:10/1:1/3:4 |
| Cadastro | pages/Cadastro.jsx | Campos com % de confiança, aviso de repetida (soma +1) ou parecida (nova) |
| Verificar | pages/Verificar.jsx | "Já tenho?" sem cadastrar |
| Desejos | pages/Desejos.jsx | Lista, marcar como comprado |
| Números | pages/Numeros.jsx | Totais, marcas, escalas, investimento |
| Comunidade | pages/Comunidade.jsx | Busca de pessoas e miniaturas, Seguindo (feed), Descobrir, Privacidade e pedidos |
| Perfil | pages/Perfil.jsx | Garagem do outro (se permitido), curtir e comentar a garagem |
| Carro de outro | pages/CarroDeOutro.jsx | Curtir, comentar, adicionar aos desejos |
| Moderação | pages/Moderacao.jsx | Filas de modelos e fotos, aprovar/rejeitar/mesclar |
| Usuários | pages/Usuarios.jsx | Admin: perfis e bloqueios |
