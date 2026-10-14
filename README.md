# Hospedaê — Flask

Projeto acadêmico de hospedagem migrado para Flask, usando SQLite para cadastro e autenticação. A página inicial, a listagem e os filtros de hotéis continuam usando os arquivos HTML/CSS/JavaScript e o JSON enviados, organizados nas pastas do Flask.

## Estrutura

```text
hospedae_flask/
├── app.py
├── requirements.txt
├── .env.example
├── README.md
├── instance/             # o banco hospedae.db é criado aqui automaticamente
├── templates/
│   ├── index.html
│   ├── hoteis.html
│   ├── base_auth.html
│   ├── login.html
│   ├── cadastro.html
│   ├── hotel.html
│   ├── reservas.html
│   └── erro.html
└── static/
    ├── css/style.css
    ├── css/auth.css
    ├── js/               # scripts do site
    └── json/dados.json
```

## Como executar no Windows

1. Instale o Python 3.10 ou mais recente.
2. Extraia o ZIP e abra a pasta `hospedae_flask` no VS Code.
3. Abra o terminal dentro dessa pasta e execute:

   ```powershell
   py -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. Opcional, mas recomendado: copie `.env.example` para `.env` e configure `SECRET_KEY` com uma chave aleatória. O app lê variáveis de ambiente; sem `.env`, funciona com uma chave de desenvolvimento que deve ser trocada antes de publicar.
5. Inicie o site:

   ```powershell
   py app.py
   ```

6. Abra `http://127.0.0.1:5000` no navegador. Não abra os HTML diretamente pelo Explorador: é necessário executar o Flask.

## O que já funciona

- Cadastro com nome, e-mail, senha, confirmação e aceite dos termos.
- Validação no servidor, e-mail único, consultas SQLite parametrizadas e senhas armazenadas com hash.
- Login, sessão, opção de manter conectado por até 14 dias e logout por POST.
- Token CSRF simples nas requisições POST.
- Página de hotéis e página de detalhes para os hotéis do arquivo JSON.
- A página “Minhas reservas” exige login, mas informa que o fluxo de reservas ainda não foi construído.

## Observações

- As imagens vêm de URLs externas do Unsplash, então precisam de internet para carregar.
- O banco `instance/hospedae.db` é criado na primeira execução e não precisa ser enviado ao GitHub. Se apagar esse arquivo, os usuários cadastrados serão apagados também.
- Antes de publicar em produção, configure uma `SECRET_KEY` forte, use HTTPS e defina `COOKIE_SECURE=1`.
- Os preços e hotéis são dados demonstrativos do projeto acadêmico; não existe integração com pagamento nem reserva real.
