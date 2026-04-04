create extension if not exists vector;

create table if not exists schema_chunks (
  id          text primary key,
  content     text        not null,
  embedding   vector(768) not null,
  table_name  text,
  column_name text,
  kind        text
);

create index if not exists idx_schema_chunks_embedding
  on schema_chunks
  using hnsw (embedding vector_cosine_ops);

create or replace function match_schema_chunks(
  query_embedding vector(768),
  match_count     int default 5
)

returns table (
  id          text,
  content     text,
  table_name  text,
  column_name text,
  kind        text,
  similarity  float
)
language sql stable as $$
  select
    id,
    content,
    table_name,
    column_name,
    kind,
    1 - (embedding <=> query_embedding) as similarity
  from schema_chunks
  order by embedding <=> query_embedding
  limit match_count;
$$;