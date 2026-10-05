-- ฐานข้อมูล Supabase ของเว็บไซต์กองช่าง (โปรเจกต์ sikaew-kongchang, ภูมิภาค ap-southeast-1)
-- สคริปต์นี้คือโครงสร้างที่ใช้งานจริง ใช้สร้างโปรเจกต์ใหม่ได้ (SQL Editor ของ Supabase)

-- เจ้าหน้าที่ที่มีสิทธิ์ใช้ข้อมูลบนคลาวด์ (ผูกกับอีเมลของบัญชีที่ยืนยันแล้ว)
create table public.staff (
  email text primary key check (email = lower(email)),
  name text not null default '',
  role text not null default 'staff' check (role in ('staff','admin')),
  created_at timestamptz not null default now()
);

-- ข้อมูลหน้าเว็บ (SK.db): รายการละแถว, collection '_order' = ลำดับรายการ, '_kv' = ค่าอื่น ๆ ทั้งก้อน
create table public.records (
  collection text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text default (auth.jwt() ->> 'email'),
  primary key (collection, id)
);

-- ชีทของระบบเอกสาร v184 ทั้งเล่ม (id = 'main')
create table public.workbooks (
  id text primary key,
  data jsonb not null,
  saved_at timestamptz,
  sample boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text default (auth.jwt() ->> 'email')
);

-- ไฟล์แนบ (ตัวไฟล์อยู่ใน Storage bucket "files")
create table public.files (
  id text primary key,
  name text not null default '',
  type text not null default '',
  size bigint not null default 0,
  path text not null,
  created_at timestamptz not null default now(),
  created_by text default (auth.jwt() ->> 'email')
);

create or replace function public.touch_updated() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.jwt() ->> 'email';
  return new;
end $$;
create trigger records_touch before update on public.records for each row execute function public.touch_updated();
create trigger workbooks_touch before update on public.workbooks for each row execute function public.touch_updated();

-- ตรวจสิทธิ์ (อยู่นอก schema ที่เปิดเป็น API)
create schema if not exists private;
grant usage on schema private to authenticated;
create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    where s.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) and coalesce((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, true)
$$;
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_staff() and exists (
    select 1 from public.staff s
    where s.email = lower(coalesce(auth.jwt() ->> 'email', '')) and s.role = 'admin'
  )
$$;
revoke all on function private.is_staff(), private.is_admin() from public, anon;
grant execute on function private.is_staff(), private.is_admin() to authenticated;

alter table public.staff enable row level security;
alter table public.records enable row level security;
alter table public.workbooks enable row level security;
alter table public.files enable row level security;
revoke all on table public.staff, public.records, public.workbooks, public.files from anon;

create policy staff_read on public.staff for select to authenticated using ((select private.is_staff()));
create policy staff_admin_insert on public.staff for insert to authenticated with check ((select private.is_admin()));
create policy staff_admin_update on public.staff for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy staff_admin_delete on public.staff for delete to authenticated using ((select private.is_admin()) and email <> lower(auth.jwt() ->> 'email'));
create policy records_all on public.records for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy workbooks_all on public.workbooks for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy files_all on public.files for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));

insert into storage.buckets (id, name, public, file_size_limit) values ('files', 'files', false, 52428800)
on conflict (id) do nothing;
create policy files_bucket_staff on storage.objects for all to authenticated
  using (bucket_id = 'files' and (select private.is_staff()))
  with check (bucket_id = 'files' and (select private.is_staff()));

-- ผู้ดูแลระบบคนแรก (เพิ่มคนอื่นได้จากหน้าเว็บ: ไอคอนคลาวด์ › จัดการเจ้าหน้าที่)
insert into public.staff (email, name, role) values ('nuttanan66447@gmail.com', 'ผู้ดูแลระบบ', 'admin');

-- ข่าวจากเพจ Facebook กองช่าง (Edge Function supabase/functions/facebook-sync) — ข่าวสาธารณะ อ่านได้ทุกคน
create table public.news_posts (
  id text primary key,
  message text not null default '',
  created_time timestamptz,
  permalink text not null default '',
  images jsonb not null default '[]'::jsonb,
  project_ids text[],          -- เจ้าหน้าที่ผูกกับโครงการเอง (null = จับคู่อัตโนมัติจากข้อความ)
  hidden boolean not null default false,
  fetched_at timestamptz not null default now()
);
create index news_posts_created_idx on public.news_posts (created_time desc);
alter table public.news_posts enable row level security;
create policy news_read on public.news_posts for select to anon, authenticated using (not hidden or (select private.is_staff()));
create policy news_staff_update on public.news_posts for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create table public.news_sync (id text primary key, synced_at timestamptz, ok boolean, message text);
alter table public.news_sync enable row level security;
create policy news_sync_read on public.news_sync for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.news_posts, public.news_sync from anon;
revoke insert, delete, truncate on public.news_posts, public.news_sync from authenticated;
revoke update on public.news_sync from authenticated;
