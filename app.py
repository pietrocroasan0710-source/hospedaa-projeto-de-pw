import json
import os
import re
import secrets
import sqlite3
from pathlib import Path

from flask import (Flask, abort, flash, g, redirect, render_template, request,
                   session, url_for)
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = Path(__file__).resolve().parent


def load_env_file():
    """Carrega variáveis simples do arquivo .env, sem dependência extra."""
    env_path = BASE_DIR / '.env'
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('\"').strip("'"))


load_env_file()
DB_PATH = Path(os.environ.get('HOSPEDAE_DB', BASE_DIR / 'instance' / 'hospedae.db'))

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-troque-esta-chave-antes-de-publicar-7e21a8'),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=os.environ.get('COOKIE_SECURE', '0') == '1',
    PERMANENT_SESSION_LIFETIME=60 * 60 * 24 * 14,
)


def get_db():
    if 'db' not in g:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


@app.teardown_appcontext
def close_db(error=None):
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
def protect_post_forms():
    if request.method == 'POST':
        token = request.form.get('csrf_token', '')
        expected = session.get('_csrf_token', '')
        if not token or not expected or not secrets.compare_digest(token, expected):
            abort(400, description='O formulário expirou. Atualize a página e tente novamente.')


@app.context_processor
def inject_user():
    return {'usuario_logado': session.get('usuario_id'), 'nome_usuario': session.get('nome', '')}


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/hoteis')
def hoteis():
    return render_template('hoteis.html')


@app.route('/cadastro', methods=['GET', 'POST'])
def cadastro():
    if session.get('usuario_id'):
        return redirect(url_for('home'))
    if request.method == 'POST':
        nome = request.form.get('nome', '').strip()
        email = request.form.get('email', '').strip().lower()
        senha = request.form.get('senha', '')
        confirmar = request.form.get('confirmar', '')
        termos = request.form.get('termos')

        if len(nome) < 2 or len(nome) > 80:
            flash('Informe seu nome (entre 2 e 80 caracteres).', 'erro')
        elif len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            flash('Digite um e-mail válido.', 'erro')
        elif len(senha) < 8:
            flash('A senha precisa ter pelo menos 8 caracteres.', 'erro')
        elif len(senha) > 128:
            flash('A senha deve ter no máximo 128 caracteres.', 'erro')
        elif senha != confirmar:
            flash('As senhas não conferem.', 'erro')
        elif not termos:
            flash('Você precisa aceitar os termos para continuar.', 'erro')
        else:
            try:
                db = get_db()
                db.execute('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
                           (nome, email, generate_password_hash(senha)))
                db.commit()
            except sqlite3.IntegrityError:
                flash('Este e-mail já está cadastrado. Entre na sua conta.', 'erro')
            else:
                flash('Conta criada com sucesso! Agora você já pode entrar.', 'sucesso')
                return redirect(url_for('login'))
    return render_template('cadastro.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('usuario_id'):
        return redirect(url_for('home'))
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        senha = request.form.get('senha', '')
        usuario = get_db().execute(
            'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ?', (email,)
        ).fetchone()
        if usuario and check_password_hash(usuario['senha_hash'], senha):
            session.clear()
            session['usuario_id'] = usuario['id']
            session['nome'] = usuario['nome']
            session['email'] = usuario['email']
            session.permanent = bool(request.form.get('lembrar'))
            flash(f'Bem-vindo(a), {usuario["nome"].split()[0]}!', 'sucesso')
            destino = request.args.get('next', '')
            if destino.startswith('/') and not destino.startswith('//'):
                return redirect(destino)
            return redirect(url_for('home'))
        flash('E-mail ou senha incorretos.', 'erro')
    return render_template('login.html')


@app.route('/sair', methods=['POST'])
def sair():
    session.clear()
    flash('Você saiu da sua conta.', 'sucesso')
    return redirect(url_for('home'))


@app.route('/hotel')
def hotel():
    try:
        hotel_id = int(request.args.get('id', '0'))
    except ValueError:
        abort(404)
    data_path = BASE_DIR / 'static' / 'json' / 'dados.json'
    with data_path.open(encoding='utf-8') as f:
        dados = json.load(f)
    encontrado = next((h for h in dados['hoteis'] if h['id'] == hotel_id), None)
    if not encontrado:
        abort(404)
    return render_template('hotel.html', hotel=encontrado)


@app.route('/reservas')
def reservas():
    if not session.get('usuario_id'):
        flash('Entre na sua conta para acessar suas reservas.', 'aviso')
        return redirect(url_for('login', next=url_for('reservas')))
    return render_template('reservas.html')


@app.errorhandler(400)
def bad_request(error):
    return render_template('erro.html', codigo=400,
                           mensagem=getattr(error, 'description', 'Não foi possível processar a solicitação.')), 400


@app.errorhandler(404)
def not_found(error):
    return render_template('erro.html', codigo=404,
                           mensagem='Não encontramos essa página ou hospedagem.'), 404


init_db()

if __name__ == '__main__':
    app.run(debug=os.environ.get('FLASK_DEBUG', '1') == '1')
