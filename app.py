import json
import os
import re
import secrets
import sqlite3
from pathlib import Path
from flask import Flask, abort, flash, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = Path(__file__).resolve().parent

def carregar_env():
    caminho = BASE_DIR / '.env'
    if caminho.exists():
        for linha in caminho.read_text(encoding='utf-8').splitlines():
            linha = linha.strip()
            if linha and not linha.startswith('#') and '=' in linha:
                chave, valor = linha.split('=', 1)
                os.environ.setdefault(chave.strip(), valor.strip().strip('\"').strip("'"))

carregar_env()
DATA_PATH = BASE_DIR / 'static' / 'json' / 'dados.json'
DB_PATH = Path(os.environ.get('GUIA_DB', BASE_DIR / 'instance' / 'guia_global.db'))

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'troque-esta-chave-antes-de-publicar'),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=os.environ.get('COOKIE_SECURE', '0') == '1',
    PERMANENT_SESSION_LIFETIME=60 * 60 * 24 * 14,
)


def carregar_dados():
    with DATA_PATH.open(encoding='utf-8') as arquivo:
        return json.load(arquivo)


def get_db():
    if 'db' not in g:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


@app.teardown_appcontext
def fechar_db(error=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as db:
        db.execute('''CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            senha_hash TEXT NOT NULL,
            criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )''')


def csrf_token():
    if '_csrf_token' not in session:
        session['_csrf_token'] = secrets.token_urlsafe(32)
    return session['_csrf_token']

app.jinja_env.globals['csrf_token'] = csrf_token


@app.before_request
def proteger_post():
    if request.method == 'POST':
        token = request.form.get('csrf_token', '')
        esperado = session.get('_csrf_token', '')
        if not token or not esperado or not secrets.compare_digest(token, esperado):
            abort(400, description='O formulário expirou. Atualize a página e tente novamente.')


@app.context_processor
def contexto_usuario():
    return {'usuario_logado': session.get('usuario_id'), 'nome_usuario': session.get('nome', '')}


def lista_destinos():
    return carregar_dados()['destinos']


def obter_destino(slug):
    return next((d for d in lista_destinos() if d['slug'] == slug), None)


@app.route('/')
def home():
    dados = carregar_dados()
    return render_template('index.html', paisagens=dados['paisagens'], destinos=dados['destinos'][:6])


@app.route('/destinos')
def destinos():
    todos = lista_destinos()
    busca = request.args.get('q', '').strip().lower()
    pais = request.args.get('pais', '').strip()
    categoria = request.args.get('categoria', '').strip()
    if busca:
        todos = [d for d in todos if busca in d['nome'].lower() or busca in d['cidade'].lower() or busca in d['pais'].lower() or busca in d['descricao'].lower()]
    if pais:
        todos = [d for d in todos if d['pais'] == pais]
    if categoria:
        todos = [d for d in todos if d['categoria'] == categoria]
    dados = carregar_dados()
    favoritos = session.get('favoritos', [])
    return render_template('destinos.html', destinos=todos, paises=sorted({d['pais'] for d in dados['destinos']}), categorias=sorted({d['categoria'] for d in dados['destinos']}), busca=busca, pais_selecionado=pais, categoria_selecionada=categoria, favoritos=favoritos)


@app.route('/destino/<slug>')
def detalhe_destino(slug):
    destino = obter_destino(slug)
    if not destino:
        abort(404)
    return render_template('destino.html', destino=destino, favorito=slug in session.get('favoritos', []), no_roteiro=slug in session.get('roteiro', []))


@app.route('/favoritos/<slug>', methods=['POST'])
def alternar_favorito(slug):
    if not obter_destino(slug):
        abort(404)
    favoritos = session.get('favoritos', [])
    if slug in favoritos:
        favoritos.remove(slug)
        flash('Destino removido dos favoritos.', 'sucesso')
    else:
        favoritos.append(slug)
        flash('Destino salvo nos favoritos!', 'sucesso')
    session['favoritos'] = favoritos
    return redirect(request.form.get('next') or url_for('destinos'))


@app.route('/favoritos')
def ver_favoritos():
    slugs = session.get('favoritos', [])
    salvos = [d for d in lista_destinos() if d['slug'] in slugs]
    return render_template('destinos.html', destinos=salvos, paises=[], categorias=[], busca='', pais_selecionado='', categoria_selecionada='', favoritos=slugs, pagina_favoritos=True)


@app.route('/roteiro', methods=['GET', 'POST'])
def roteiro():
    slugs = session.get('roteiro', [])
    if request.method == 'POST':
        slug = request.form.get('slug', '')
        if not obter_destino(slug):
            abort(404)
        if request.form.get('acao') == 'remover':
            slugs = [s for s in slugs if s != slug]
            flash('Destino removido do roteiro.', 'sucesso')
        elif slug not in slugs:
            slugs.append(slug)
            flash('Destino adicionado ao seu roteiro!', 'sucesso')
        session['roteiro'] = slugs
        return redirect(request.form.get('next') or url_for('roteiro'))
    itens = [d for d in lista_destinos() if d['slug'] in slugs]
    return render_template('roteiro.html', destinos=itens)


@app.route('/cadastro', methods=['GET', 'POST'])
def cadastro():
    if session.get('usuario_id'):
        return redirect(url_for('home'))
    if request.method == 'POST':
        nome = request.form.get('nome', '').strip()
        email = request.form.get('email', '').strip().lower()
        senha = request.form.get('senha', '')
        confirmar = request.form.get('confirmar', '')
        if len(nome) < 2 or len(nome) > 80:
            flash('Informe seu nome (entre 2 e 80 caracteres).', 'erro')
        elif len(email) > 254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
            flash('Digite um e-mail válido.', 'erro')
        elif len(senha) < 8:
            flash('A senha precisa ter pelo menos 8 caracteres.', 'erro')
        elif len(senha) > 128:
            flash('A senha deve ter no máximo 128 caracteres.', 'erro')
        elif senha != confirmar:
            flash('As senhas não conferem.', 'erro')
        elif not request.form.get('termos'):
            flash('Você precisa aceitar os termos para continuar.', 'erro')
        else:
            try:
                get_db().execute('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)', (nome, email, generate_password_hash(senha)))
                get_db().commit()
            except sqlite3.IntegrityError:
                flash('Este e-mail já está cadastrado. Entre na sua conta.', 'erro')
            else:
                flash('Conta criada com sucesso! Agora entre na sua conta.', 'sucesso')
                return redirect(url_for('login'))
    return render_template('cadastro.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('usuario_id'):
        return redirect(url_for('home'))
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        senha = request.form.get('senha', '')
        usuario = get_db().execute('SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ?', (email,)).fetchone()
        if usuario and check_password_hash(usuario['senha_hash'], senha):
            session.clear()
            session['usuario_id'] = usuario['id']
            session['nome'] = usuario['nome']
            session['email'] = usuario['email']
            session.permanent = bool(request.form.get('lembrar'))
            flash(f'Bem-vindo(a), {usuario["nome"].split()[0]}!', 'sucesso')
            destino = request.args.get('next', '')
            return redirect(destino if destino.startswith('/') and not destino.startswith('//') else url_for('home'))
        flash('E-mail ou senha incorretos.', 'erro')
    return render_template('login.html')


@app.route('/sair', methods=['POST'])
def sair():
    session.clear()
    flash('Você saiu da sua conta.', 'sucesso')
    return redirect(url_for('home'))


@app.errorhandler(400)
def erro_requisicao(error):
    return render_template('erro.html', codigo=400, mensagem=getattr(error, 'description', 'Não foi possível processar a solicitação.')), 400


@app.errorhandler(404)
def pagina_nao_encontrada(error):
    return render_template('erro.html', codigo=404, mensagem='Não encontramos esse destino ou página.'), 404


init_db()

if __name__ == '__main__':
    app.run(debug=os.environ.get('FLASK_DEBUG', '1') == '1')
