-- The Sewer Lid: collector vault setup for Supabase.
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- It is safe to run more than once.

-- Collectors (one row per signed-in person; name comes from their GitHub account)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default 'Collector',
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles for select using (true);
drop policy if exists "add own profile" on public.profiles;
create policy "add own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "edit own profile" on public.profiles;
create policy "edit own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Moderators (add yourself after your first sign-in; see the README)
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade
);
alter table public.admins enable row level security;
drop policy if exists "admins are readable" on public.admins;
create policy "admins are readable" on public.admins for select using (true);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- Vault items (one row per photo)
create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  category text not null default 'Figure' check (char_length(category) <= 40),
  notes text check (notes is null or char_length(notes) <= 500),
  image_path text not null,
  is_public boolean not null default true,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists vault_items_created on public.vault_items (created_at desc);
create index if not exists vault_items_owner on public.vault_items (owner);
alter table public.vault_items enable row level security;
drop policy if exists "see public items, your own, or all if moderator" on public.vault_items;
create policy "see public items, your own, or all if moderator" on public.vault_items for select
  using ((is_public and not hidden) or owner = auth.uid() or public.is_admin());
drop policy if exists "add your own items" on public.vault_items;
create policy "add your own items" on public.vault_items for insert with check (owner = auth.uid() and hidden = false);
drop policy if exists "edit your own items" on public.vault_items;
create policy "edit your own items" on public.vault_items for update using (owner = auth.uid() or public.is_admin()) with check (owner = auth.uid() or public.is_admin());
drop policy if exists "delete your own items" on public.vault_items;
create policy "delete your own items" on public.vault_items for delete using (owner = auth.uid() or public.is_admin());

-- Owners cannot un-hide an item a moderator or reports hid
create or replace function public.keep_hidden() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.hidden and not new.hidden and not public.is_admin() then
    new.hidden := true;
  end if;
  return new;
end $$;
drop trigger if exists vault_items_keep_hidden on public.vault_items;
create trigger vault_items_keep_hidden before update on public.vault_items for each row execute function public.keep_hidden();

-- Reports (three reports hide an item until a moderator looks at it)
create table if not exists public.vault_reports (
  id bigint generated always as identity primary key,
  item_id uuid not null references public.vault_items on delete cascade,
  reporter uuid not null default auth.uid() references auth.users on delete cascade,
  reason text check (reason is null or char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  unique (item_id, reporter)
);
alter table public.vault_reports enable row level security;
drop policy if exists "report items" on public.vault_reports;
create policy "report items" on public.vault_reports for insert with check (reporter = auth.uid());
drop policy if exists "moderators read reports" on public.vault_reports;
create policy "moderators read reports" on public.vault_reports for select using (public.is_admin());

create or replace function public.auto_hide() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from vault_reports where item_id = new.item_id) >= 3 then
    update vault_items set hidden = true where id = new.item_id;
  end if;
  return new;
end $$;
drop trigger if exists vault_reports_hide on public.vault_reports;
create trigger vault_reports_hide after insert on public.vault_reports for each row execute function public.auto_hide();

-- Photo storage: a private bucket; each person uploads into a folder named after their account
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vault', 'vault', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "vault: upload to your own folder" on storage.objects;
create policy "vault: upload to your own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'vault' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "vault: delete your own photos" on storage.objects;
create policy "vault: delete your own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'vault' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "vault: view shared photos and your own" on storage.objects;
create policy "vault: view shared photos and your own" on storage.objects for select
  using (bucket_id = 'vault' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
    or exists (select 1 from public.vault_items v where v.image_path = storage.objects.name and v.is_public and not v.hidden)
  ));
