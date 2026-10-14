# Hospedaê — Projeto Web com Flask

**Tipo:** projeto acadêmico de hospedagem  
**Tecnologias:** Python, Flask, HTML, CSS, JavaScript, JSON e SQLite

O Hospedaê é um site de apresentação e consulta de hospedagens. A interface original foi organizada para funcionar dentro de uma aplicação Flask. O projeto inclui páginas inicial e de hotéis, detalhes de uma hospedagem, cadastro de usuário, login, sessão e uma página protegida de reservas. O cadastro de contas é salvo em um banco SQLite criado automaticamente.

> **Estado atual:** a parte de cadastro e autenticação está implementada, mas o fluxo de reserva real ainda não foi desenvolvido. A página “Minhas reservas” é apenas uma página inicial protegida por login; ela ainda não cria nem lista reservas.

## 1. Como executar no Windows

1. Extraia o arquivo ZIP.
2. Abra a pasta `hospedae_flask` no VS Code.
3. Abra **Terminal → Novo Terminal**.
4. Instale as dependências:

   ```powershell
   pip install -r requirements.txt
   ```

5. Inicie o servidor:

   ```powershell
   py app.py
   ```

6. Abra `http://127.0.0.1:5000` no navegador.

Se o comando `py` não funcionar no seu computador, tente `python app.py`. Não abra os arquivos HTML diretamente pelo Explorador: as páginas precisam ser servidas pelo Flask.

### Configuração da chave secreta

O projeto inclui `.env.example` como modelo. Para configurar uma chave própria, faça uma cópia chamada `.env` na mesma pasta de `app.py` e substitua o valor de `SECRET_KEY` por uma chave longa e aleatória. O código lê esse arquivo sem precisar instalar outra biblioteca. A chave padrão é apenas para desenvolvimento e deve ser trocada antes de publicar o site. Em produção, configure HTTPS e `COOKIE_SECURE=1`.

## 2. Estrutura das pastas

```text
hospedae_flask/
├── app.py                  # aplicação Flask, rotas, autenticação e banco
├── requirements.txt        # dependências Python
├── .env.example            # exemplo de configurações privadas
├── README.md               # este relatório e manual do projeto
├── instance/
│   └── hospedae.db         # banco SQLite criado automaticamente
├── templates/              # páginas HTML renderizadas pelo Flask/Jinja
│   ├── index.html
│   ├── hoteis.html
│   ├── base_auth.html
│   ├── cadastro.html
│   ├── login.html
│   ├── hotel.html
│   ├── reservas.html
│   └── erro.html
└── static/
    ├── css/
    │   ├── style.css       # estilos do site principal
    │   └── auth.css        # estilos de login e cadastro
    ├── js/                 # comportamento e interações no navegador
    └── json/
        └── dados.json      # dados demonstrativos das hospedagens
```

**Por que separar assim?** O Flask procura páginas HTML na pasta `templates`. Arquivos que o navegador carrega diretamente — CSS, JavaScript e JSON — ficam em `static`. O arquivo `app.py` conecta as páginas, processa formulários e acessa o banco de dados.

## 3. Relatório técnico: como o código Flask funciona

### 3.1. Inicialização da aplicação

O arquivo `app.py` importa o Flask e bibliotecas do Python para trabalhar com arquivos, JSON, expressões regulares, sessões, segurança e SQLite. A variável `BASE_DIR` identifica a pasta do projeto para que os caminhos funcionem mesmo quando a aplicação é iniciada a partir de outro diretório.

A função `load_env_file()` lê configurações simples de um arquivo `.env`, caso ele exista. Em seguida, o Flask é criado e recebe configurações para a chave de sessão e os cookies. A aplicação inicia o banco chamando `init_db()` e, quando o arquivo é executado diretamente, inicia o servidor local.

### 3.2. Rotas e navegação

Uma **rota** é um endereço que o servidor sabe atender. Os decoradores `@app.route(...)` ligam uma URL a uma função Python:

- `/` — abre a página inicial (`index.html`).
- `/hoteis` — apresenta a listagem de hospedagens (`hoteis.html`).
- `/cadastro` — mostra o formulário e processa o cadastro enviado por `POST`.
- `/login` — mostra o formulário e confere as credenciais enviadas.
- `/sair` — encerra a sessão por uma requisição `POST`.
- `/hotel?id=...` — lê o identificador recebido na URL, procura a hospedagem no JSON e mostra sua página de detalhes.
- `/reservas` — exige uma sessão autenticada, mas ainda não implementa reservas reais.

`render_template()` renderiza um arquivo HTML da pasta `templates`. `redirect()` e `url_for()` encaminham o usuário para outra rota sem precisar escrever todos os endereços manualmente. `abort(404)` informa que a página ou hospedagem solicitada não foi encontrada.

### 3.3. Templates, CSS e JavaScript

Os HTML foram adaptados para o sistema de templates do Flask, chamado **Jinja**. Isso permite gerar links com `url_for()`, exibir mensagens de retorno e alterar a navegação conforme o usuário está conectado ou não.

O CSS controla a aparência. Os arquivos JavaScript continuam cuidando das interações no navegador, como a exibição de cards e filtros. O arquivo `dados.json` contém dados demonstrativos das hospedagens, que são usados pelos scripts e pela rota de detalhes. Esses dados não são cadastrados em uma área administrativa e não vêm de uma API externa.

### 3.4. Banco de dados SQLite

O projeto usa SQLite, um banco de dados que fica em um arquivo local. A função `init_db()` cria a tabela `usuarios` se ela ainda não existir. Ela guarda:

- `id`: identificador único do usuário;
- `nome`: nome informado no cadastro;
- `email`: endereço de e-mail, que deve ser único;
- `senha_hash`: representação protegida da senha, não a senha original;
- `criado_em`: data e horário de criação do registro.

A função `get_db()` abre a conexão quando necessário, e `close_db()` fecha a conexão ao terminar o contexto da requisição. O banco é criado em `instance/hospedae.db` por padrão. Ele é criado na primeira execução e não precisa ser incluído no repositório público. Se o arquivo do banco for apagado, os usuários cadastrados nesse arquivo também serão perdidos.

### 3.5. Cadastro de usuário

Quando o formulário de cadastro é enviado, a rota `/cadastro` recebe os dados por `POST`. O servidor remove espaços extras do nome e do e-mail, padroniza o e-mail em letras minúsculas e valida os campos: tamanho do nome, formato do e-mail, tamanho da senha, confirmação da senha e aceite dos termos.

Se os dados passarem pelas validações, `generate_password_hash()` cria um hash da senha antes de salvar o registro. O comando SQL usa parâmetros (`?`) em vez de montar a consulta juntando texto recebido do usuário. Isso ajuda a evitar injeção de SQL. A restrição `UNIQUE` no banco impede que dois cadastros usem o mesmo e-mail. Quando o cadastro dá certo, a aplicação informa o resultado e encaminha o usuário para a página de login.

### 3.6. Login, sessão e logout

Na rota `/login`, o servidor procura o usuário pelo e-mail e usa `check_password_hash()` para comparar a senha digitada com o hash guardado no banco. Se as credenciais forem válidas, a aplicação limpa a sessão anterior e registra o identificador, o nome e o e-mail do usuário na sessão.

A sessão permite que o site reconheça o usuário entre requisições sem pedir a senha em cada página. A opção “lembrar” torna a sessão permanente pelo período configurado de até 14 dias. A rota `/sair` limpa a sessão. A aplicação também injeta informações básicas do usuário nos templates para a navegação poder mostrar opções diferentes conforme o estado de login.

### 3.7. Proteções incluídas

- **Hash de senha:** evita armazenar a senha original em texto puro.
- **Consultas parametrizadas:** reduzem o risco de injeção de SQL.
- **Validação no servidor:** não depende apenas das validações visuais do formulário.
- **E-mail único:** aplicado também pelo próprio banco de dados.
- **Token CSRF:** formulários enviados por `POST` precisam incluir um token associado à sessão.
- **Cookies de sessão:** configurados com `HttpOnly` e `SameSite=Lax`; a opção `Secure` pode ser ativada em HTTPS.
- **Rotas protegidas:** a página `/reservas` redireciona visitantes não autenticados para o login.

Essas medidas são uma base de estudo, não uma auditoria completa de segurança. Antes de disponibilizar o site publicamente, é necessário revisar a configuração de produção, usar uma chave secreta própria, HTTPS e testar as proteções.

### 3.8. Limitações conhecidas

1. **Reservas reais não estão implementadas.** Não há tabela de reservas, formulário de datas, disponibilidade nem associação de reserva ao usuário.
2. **Não existe pagamento.** Os preços e hospedagens são demonstrativos.
3. **Os dados das hospedagens estão em JSON.** Ainda não existe painel administrativo para cadastrar, editar ou remover hotéis.
4. **As imagens são externas.** Dependem de conexão com a internet e da disponibilidade dos endereços utilizados.
5. **O servidor está configurado para desenvolvimento.** `debug` deve ficar desativado ao publicar a aplicação.

## 4. Próximos passos para considerar o projeto concluído

Use esta lista como plano de finalização. Marque os itens apenas depois de executar e verificar cada um.

### Etapa A — testar as funções atuais

- [ ] Abrir a página inicial e navegar até a listagem de hotéis.
- [ ] Conferir se os cards, filtros, imagens e links funcionam.
- [ ] Abrir a página de detalhes de diferentes hospedagens.
- [ ] Criar uma conta com dados válidos.
- [ ] Tentar cadastrar o mesmo e-mail novamente e confirmar que o sistema bloqueia a duplicação.
- [ ] Testar senha curta, e-mail inválido, senhas diferentes e formulário sem aceite dos termos.
- [ ] Entrar com a senha correta e confirmar que o nome aparece na navegação.
- [ ] Tentar entrar com senha incorreta e conferir a mensagem de erro.
- [ ] Acessar `/reservas` sem login e confirmar que o site redireciona para o login.
- [ ] Sair da conta e confirmar que a sessão foi encerrada.
- [ ] Verificar o console do navegador e o terminal para identificar erros de JavaScript ou Python.

### Etapa B — decidir o que significa “projeto completo”

Para uma entrega acadêmica demonstrando um site com cadastro e login, a base atual pode servir **depois de todos os testes acima passarem** e de você explicar honestamente que reservas reais ainda não fazem parte do sistema.

Se o objetivo é um site de hospedagem funcional de ponta a ponta, o próximo desenvolvimento mais importante é:

- [ ] Criar uma tabela `reservas` no SQLite, ligada ao usuário e à hospedagem.
- [ ] Criar um formulário de reserva com data de entrada, data de saída e quantidade de hóspedes.
- [ ] Validar que a data de saída é posterior à data de entrada e que as datas são válidas.
- [ ] Salvar reservas no banco e mostrar somente as reservas do usuário conectado.
- [ ] Criar uma forma de cancelar uma reserva, se fizer parte dos requisitos.
- [ ] Definir como verificar disponibilidade e calcular o preço total.

Não diga que há reserva ou pagamento real até que essas funcionalidades existam e tenham sido testadas.

### Etapa C — acabamento e entrega

- [ ] Conferir a aparência em telas pequenas e grandes.
- [ ] Revisar textos, acentos, botões, mensagens de erro e acessibilidade básica.
- [ ] Confirmar que a aplicação funciona após fechar e iniciar o servidor novamente.
- [ ] Configurar `.env` com uma `SECRET_KEY` própria; não enviar esse arquivo com segredos ao GitHub.
- [ ] Manter `instance/hospedae.db` fora do repositório, a menos que exista uma razão explícita para compartilhar dados de demonstração.
- [ ] Adicionar um `.gitignore` para `.venv/`, `.env`, `__pycache__/`, `*.pyc` e o banco local.
- [ ] Atualizar este README para refletir as funcionalidades que realmente estiverem prontas.
- [ ] Subir o código para o GitHub e testar a instalação a partir de uma cópia limpa do repositório.
- [ ] Se for publicar na internet, escolher uma hospedagem compatível com Flask/WSGI, configurar variáveis de ambiente e HTTPS, desligar o modo debug e verificar como o banco será armazenado com persistência.
- [ ] Preparar uma apresentação curta: problema, objetivo, tecnologias, estrutura, demonstração, testes e melhorias futuras.

## 5. Comandos úteis

```powershell
# Instalar as dependências
pip install -r requirements.txt

# Iniciar o servidor local
py app.py

# Verificar a sintaxe do arquivo Python
py -m py_compile app.py
```

O servidor de desenvolvimento normalmente mostra o endereço local no terminal. Para encerrá-lo, volte ao terminal e pressione `Ctrl+C`.

## 6. Resumo para apresentar o projeto

O Hospedaê é uma aplicação web desenvolvida com Flask. O Flask gerencia as rotas, processa os formulários e conecta a interface ao banco SQLite. O cadastro valida os dados e armazena hashes de senha; o login verifica as credenciais e mantém o estado do usuário por sessão. Os templates Jinja organizam as páginas HTML, enquanto CSS e JavaScript controlam a apresentação e as interações no navegador. Os dados demonstrativos das hospedagens ficam em um arquivo JSON. Como melhoria futura, o projeto pode implementar o fluxo completo de reservas e a gestão de disponibilidade.
