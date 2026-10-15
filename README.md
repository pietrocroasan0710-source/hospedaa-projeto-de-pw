# Mundo Aberto — Guia Turístico Global

Projeto acadêmico em Flask que reúne destinos turísticos de vários países, com pesquisa, filtros, páginas de detalhes, favoritos e roteiro pessoal.

## O que foi reaproveitado do projeto anterior

- A ideia visual do **slideshow de paisagens**: o `static/js/main.js` troca automaticamente as imagens de fundo a cada 6 segundos, usando a lista `paisagens` de `static/json/dados.json`.
- A base do Flask, autenticação/cadastro, sessão, banco SQLite, hash de senha, validações e proteção CSRF.
- O JavaScript de animações existente foi mantido como `static/js/animacoes.js` e continua cuidando de navegação suave, navbar ao rolar, botão voltar ao topo e animações de entrada.
- O conceito de cards e filtros foi adaptado de hospedagens para destinos turísticos.

## Funcionalidades

- Página inicial com slideshow de paisagens e destinos em destaque.
- Catálogo de destinos de diferentes continentes.
- Busca por nome, cidade, país ou descrição.
- Filtros por país e categoria.
- Página individual com descrição, atrações sugeridas, melhor época e duração recomendada.
- Favoritos e roteiro de viagem armazenados na sessão do navegador.
- Cadastro e login com senha protegida por hash e armazenamento SQLite.
- Proteção CSRF nos formulários POST, mensagens flash e páginas de erro.
- Layout responsivo para desktop e celular.

## Como executar

Recomendado: Python 3.10 ou superior.

1. Abra o terminal na pasta do projeto.
2. Crie um ambiente virtual (opcional, mas recomendado):

   ```bash
   python -m venv .venv
   ```

3. Ative o ambiente virtual:

   - Windows: `.venv\\Scripts\\activate`
   - macOS/Linux: `source .venv/bin/activate`

4. Instale a dependência:

   ```bash
   pip install -r requirements.txt
   ```

5. Execute:

   ```bash
   python app.py
   ```

6. Abra `http://127.0.0.1:5000` no navegador.

O banco `instance/guia_global.db` é criado automaticamente na primeira execução. Para configurar uma chave secreta própria, copie `.env.example` para `.env` e defina `SECRET_KEY`; o `app.py` lê esse arquivo sem dependências adicionais. Em produção, desative o modo debug e configure HTTPS com `COOKIE_SECURE=1`.

## Estrutura

```text
guia_global/
├── app.py
├── requirements.txt
├── README.md
├── .env.example
├── instance/                 # banco SQLite criado automaticamente
├── static/
│   ├── css/style.css
│   ├── js/animacoes.js
│   ├── js/cards.js
│   ├── js/main.js
│   └── json/dados.json
└── templates/
    ├── base.html
    ├── index.html
    ├── destinos.html
    ├── destino.html
    ├── roteiro.html
    ├── auth.html
    ├── login.html
    ├── cadastro.html
    └── erro.html
```

## Como o Flask funciona neste projeto

- `app.py` cria a aplicação, configura a sessão e define o caminho do SQLite.
- `get_db()` abre a conexão com o banco sob demanda; `close_db()` fecha a conexão no fim da requisição.
- `init_db()` cria a tabela `usuarios` se ela ainda não existir.
- `cadastro()` valida os dados, transforma a senha em hash e grava o novo usuário com parâmetros SQL.
- `login()` procura o e-mail e compara a senha informada com o hash armazenado. Quando os dados conferem, guarda o ID e o nome na sessão.
- `proteger_post()` exige um token CSRF válido em todas as requisições POST.
- `carregar_dados()` lê os destinos do JSON. As rotas `/destinos`, `/destino/<slug>`, `/favoritos` e `/roteiro` usam esses dados para montar as páginas.
- Os favoritos e o roteiro são mantidos na sessão do navegador; isso é simples para um protótipo, mas não é sincronizado entre dispositivos nem armazenado permanentemente no perfil do usuário.
- Os templates Jinja geram o HTML no servidor. CSS controla o visual responsivo e JavaScript cuida do slideshow e de pequenas animações.

## Limitações e próximos passos

- Os destinos e dicas são conteúdo demonstrativo, não uma API de turismo em tempo real. Confira horários, regras de entrada, preços e recomendações em fontes oficiais antes de viajar.
- As imagens vêm do Unsplash por URLs externas; exigem conexão com a internet e podem mudar.
- Favoritos e roteiro ficam na sessão do navegador. Uma melhoria futura seria criar tabelas próprias para associá-los a usuários autenticados.
- Antes de publicar, gere uma `SECRET_KEY` forte, desative o debug, configure HTTPS e revise os termos de uso.
