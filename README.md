# Luziflor Gestão

MVP de controle de **estoque, vendas e fiado** para a **Luziflor Modas**, pequena loja de roupas que funciona na garagem da casa da proprietária, no Residencial Parque Cumbica, em Guarulhos (SP).

Projeto acadêmico da disciplina **Projeto de Software** (Análise e Desenvolvimento de Sistemas – Cruzeiro do Sul), alinhado ao **ODS 8 – Trabalho Decente e Crescimento Econômico** (meta 8.3: apoio a micro e pequenos empreendedores).

## O problema

Hoje todo o controle da loja é feito de memória e em um caderno. A proprietária não sabe com precisão o que tem no estoque, o que mais vende, quanto lucra nem quem está devendo no fiado. Isso causa vendas perdidas, compras por intuição e risco de não receber o fiado.

## A solução

Um aplicativo para celular (PWA), simples e acessível, que:

- funciona **sem internet** (os dados ficam no celular e são enviados ao servidor quando a conexão volta);
- tem **botões grandes**, texto em linguagem do dia a dia e status indicados por **texto, ícone e cor**;
- não tem mensalidade e não depende de banco ou maquininha.

### Requisitos implementados

| Requisito | Descrição | Onde |
|---|---|---|
| RF01 | Cadastrar peça (nome, categoria, tamanho, custo, preço, quantidade) | Tela Estoque |
| RF02 | Registrar entrada de mercadoria | Tela Estoque |
| RF03 | Consultar estoque por nome e tamanho | Telas Estoque e Vender |
| RF04 | Registrar venda com forma de pagamento e baixa automática no estoque | Tela Vender |
| RF05 | Venda no fiado vinculada a cliente (com cadastro rápido de cliente) | Tela Vender |
| RF06 | Lista de quem deve e total a receber | Telas Início, Fiado e Resultado |
| RF07 | Marcar venda no fiado como paga (com confirmação) | Telas Resultado e Fiado |
| RNF01 | Login com senha em hash bcrypt, token JWT de 30 min e bloqueio após 5 tentativas | `backend/app/seguranca.py` |
| RNF02 | Validação no servidor (Pydantic), SQL parametrizado (SQLAlchemy), bloqueio de `<` `>`, CSP, erros genéricos | back-end e `index.html` |
| RNF03 | PWA com service worker, telas carregadas sob demanda | front-end |
| RNF04 | Toque mínimo de 48 px, texto de 18 px, contraste AA, foco visível, rótulos visíveis | `frontend/src/styles.css` |

RF08 (mais vendidos) e RF09 (lucro por período) são **desejáveis** e ficaram para a próxima versão. Os dados necessários (quantidade, preço e custo de cada item vendido) já são gravados.

## Tecnologias

| Parte | Tecnologia |
|---|---|
| Front-end | Angular 22 (TypeScript), Angular Service Worker (PWA), Dexie.js (IndexedDB) |
| Back-end | Python 3.13, FastAPI (com Pydantic), SQLAlchemy 2 |
| Banco | PostgreSQL (Supabase) em produção; SQLite para desenvolvimento |
| Segurança | bcrypt, PyJWT |
| Testes | pytest (back-end) e Vitest (regras do front-end) |

Arquitetura: **monolítica em camadas, offline-first**.
No front-end: telas (componentes) → serviços (regras) → repositórios (IndexedDB) → sincronização.
No back-end: rotas → regras/validação → repositórios → banco.

## Estrutura

```
luziflor-gestao/
├── backend/
│   ├── app/
│   │   ├── main.py            # API, CORS, cabeçalhos de segurança, erros genéricos
│   │   ├── config.py          # configurações via variáveis de ambiente
│   │   ├── database.py        # conexão SQLAlchemy
│   │   ├── models.py          # produto, cliente, venda, item_venda
│   │   ├── schemas.py         # validação das entradas (Pydantic)
│   │   ├── regras.py          # regras de negócio puras
│   │   ├── repositorios.py    # acesso ao banco (padrão Repository)
│   │   ├── seguranca.py       # bcrypt, JWT, bloqueio de tentativas
│   │   └── routers/           # auth, produtos, clientes, vendas
│   ├── scripts/gerar_hash.py  # gera o hash da senha
│   ├── sql/001_criar_tabelas.sql
│   ├── tests/                 # testes automatizados
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/app/
│   │   ├── core/              # modelos, regras, banco local, repositórios, serviços
│   │   ├── telas/             # entrar, inicio, vender, resultado, fiado, estoque
│   │   └── compartilhado/     # ícones e indicador de sincronização
│   ├── public/                # manifest e ícones do PWA
│   └── ngsw-config.json       # configuração do service worker
└── docs/prototipo/            # telas do protótipo (EP II)
```

## Como rodar no computador

Pré-requisitos: **Python 3.13** e **Node.js 24 LTS** (ou 22.22+).

### 1. Back-end

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    |    Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                 # Windows: copy .env.example .env
python scripts/gerar_hash.py         # cole o SENHA_HASH gerado no .env
# no .env, troque também o JWT_SECRET por um texto longo e aleatório
uvicorn app.main:app --reload
```

A API abre em http://localhost:8000 e a documentação em http://localhost:8000/docs.

### 2. Front-end

```bash
cd frontend
npm install
npm start
```

O app abre em http://localhost:4200. Entre com a senha usada no `gerar_hash.py`.

### 3. Testes

```bash
cd backend && pytest        # regras de negócio, login, validação e fluxo do fiado
cd frontend && npm test     # regras de negócio do front-end
```

## Publicação (gratuita)

1. **Banco:** crie um projeto no Supabase e rode `backend/sql/001_criar_tabelas.sql` no SQL Editor.
2. **API:** crie um *Web Service* no Render apontando para a pasta `backend`.
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"`
   - Variáveis: `DATABASE_URL` (string do Supabase, começando com `postgresql+psycopg://`), `JWT_SECRET`, `SENHA_HASH`, `CORS_ORIGINS` (endereço do GitHub Pages) e `AMBIENTE=prod`.
3. **App:** em `frontend/src/environments/environment.ts`, coloque a URL da API; depois:
   ```bash
   cd frontend
   npm run build:pages
   ```
   Publique o conteúdo de `frontend/dist/luziflor-gestao/browser` no GitHub Pages.

Os planos gratuitos podem suspender o servidor quando fica sem uso. Como o app é offline-first, a loja continua funcionando e os dados são enviados quando o servidor volta.

## Segurança

- A senha nunca é guardada em texto limpo, nem com MD5 ou SHA-1: só o hash **bcrypt** (custo 12).
- Todas as rotas de dados exigem token JWT válido; sem token, a resposta é 401.
- Após 5 tentativas de login erradas em 15 minutos, o login fica bloqueado por 15 minutos.
- Segredos ficam em variáveis de ambiente. O arquivo `.env` está no `.gitignore`.
- Do cliente, o sistema guarda só nome e telefone opcional (sem CPF ou endereço).

## Limitações conhecidas

- A lista de tokens revogados e o controle de tentativas ficam na memória do servidor e são zerados se ele reiniciar. Para uma única usuária e um único servidor, isso é aceitável no MVP.
- O pagamento do fiado é registrado por venda inteira; pagamentos parciais ficam para uma próxima versão.
- O estoque é controlado no celular (fonte da verdade) e enviado ao servidor na sincronização. O MVP foi pensado para um único aparelho.

## Autoria

Desenvolvido por Jessica, estudante de Análise e Desenvolvimento de Sistemas, com a parceria da proprietária da Luziflor Modas.
