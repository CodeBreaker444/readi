alter table public.users
  add column if not exists department varchar(100);

create index if not exists idx_users_department on public.users (department);
