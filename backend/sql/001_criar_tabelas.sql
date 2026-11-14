-- Criação das tabelas do MVP Luziflor Gestão (PostgreSQL)
-- Versão 1 – produto, cliente, venda e item_venda

CREATE TABLE IF NOT EXISTS produto (
    id_produto          VARCHAR(36)   PRIMARY KEY,
    nome                VARCHAR(100)  NOT NULL,
    categoria           VARCHAR(20)   NOT NULL CHECK (categoria IN ('feminino','masculino','infantil')),
    tamanho             VARCHAR(20)   NOT NULL,
    preco_custo         NUMERIC(10,2) NOT NULL,
    preco_venda         NUMERIC(10,2) NOT NULL,
    quantidade_estoque  INTEGER       NOT NULL,
    ativo               BOOLEAN       NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMP     NOT NULL,
    atualizado_em       TIMESTAMP     NOT NULL,
    CONSTRAINT uq_produto_nome_tamanho UNIQUE (nome, tamanho),
    CONSTRAINT ck_estoque_nao_negativo CHECK (quantidade_estoque >= 0),
    CONSTRAINT ck_precos_positivos CHECK (preco_custo > 0 AND preco_venda > 0)
);

CREATE TABLE IF NOT EXISTS cliente (
    id_cliente  VARCHAR(36)  PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    telefone    VARCHAR(20),
    observacao  VARCHAR(200),
    criado_em   TIMESTAMP    NOT NULL
);

CREATE TABLE IF NOT EXISTS venda (
    id_venda          VARCHAR(36)   PRIMARY KEY,
    data_venda        TIMESTAMP     NOT NULL,
    forma_pagamento   VARCHAR(10)   NOT NULL,
    valor_total       NUMERIC(10,2) NOT NULL,
    canal             VARCHAR(15)   NOT NULL DEFAULT 'presencial',
    id_cliente        VARCHAR(36)   REFERENCES cliente (id_cliente),
    status_pagamento  VARCHAR(10)   NOT NULL,
    data_quitacao     DATE,
    CONSTRAINT ck_valor_total_positivo CHECK (valor_total > 0),
    CONSTRAINT ck_forma_pagamento CHECK (forma_pagamento IN ('dinheiro','pix','cartao','fiado')),
    CONSTRAINT ck_status_pagamento CHECK (status_pagamento IN ('pago','pendente')),
    CONSTRAINT ck_fiado_exige_cliente CHECK (forma_pagamento <> 'fiado' OR id_cliente IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS item_venda (
    id_item         VARCHAR(36)   PRIMARY KEY,
    id_venda        VARCHAR(36)   NOT NULL REFERENCES venda (id_venda) ON DELETE CASCADE,
    id_produto      VARCHAR(36)   NOT NULL REFERENCES produto (id_produto),
    quantidade      INTEGER       NOT NULL CHECK (quantidade > 0),
    preco_unitario  NUMERIC(10,2) NOT NULL,
    custo_unitario  NUMERIC(10,2) NOT NULL
);

-- Índices para as buscas mais usadas
CREATE INDEX IF NOT EXISTS ix_produto_nome ON produto (nome);
CREATE INDEX IF NOT EXISTS ix_venda_status ON venda (forma_pagamento, status_pagamento);
CREATE INDEX IF NOT EXISTS ix_venda_cliente ON venda (id_cliente);
