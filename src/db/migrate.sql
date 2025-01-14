CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO items (name) VALUES ('test1');
INSERT INTO items (name) VALUES ('test2');
INSERT INTO items (name) VALUES ('test3');
INSERT INTO items (name) VALUES ('test4');