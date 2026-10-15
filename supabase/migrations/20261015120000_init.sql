-- Алгоскоп: схема облачного режима (Supabase).
--
-- Что здесь есть:
--   profiles          — имя и роль пользователя (преподаватель видит имена участников своих классов)
--   user_data         — облачная копия локальных данных (прогресс, наборы, достижения), один JSON на пользователя
--   classes           — классы преподавателя с кодом для вступления
--   class_members     — участники классов
--   assignments       — задания классу: список алгоритмов и срок
--   license_requests  — заявки на лицензию со страницы «Для учебных заведений»
--
-- Все таблицы закрыты политиками RLS: пользователь видит только свои данные.
-- Создание класса, вступление по коду, сводка прогресса и удаление аккаунта идут
-- через функции security definer, которые сами проверяют права вызывающего.
--
-- Применение: `supabase db push` из корня проекта или вставить файл целиком в SQL Editor.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- профили

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: читать свой профиль" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: создать свой профиль" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles: менять свой профиль" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------------------------------------------------------------- данные пользователя

create table public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- ограничение размера защищает базу от случайно (или намеренно) огромных записей
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 1000000),
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "user_data: читать свои данные" on public.user_data
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_data: создать свои данные" on public.user_data
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_data: менять свои данные" on public.user_data
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "user_data: удалять свои данные" on public.user_data
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- классы

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6,8}$'),
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index classes_owner_idx on public.classes (owner_id);

create table public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

create index class_members_user_idx on public.class_members (user_id);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  algorithm_ids text[] not null check (cardinality(algorithm_ids) between 1 and 60),
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create index assignments_class_idx on public.assignments (class_id);

-- Проверки владения и участия вынесены в функции security definer:
-- иначе политики classes и class_members ссылались бы друг на друга и зацикливались.
create function public.is_class_owner(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.classes c where c.id = p_class_id and c.owner_id = (select auth.uid()));
$$;

create function public.is_class_member(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.class_members m where m.class_id = p_class_id and m.user_id = (select auth.uid()));
$$;

alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments enable row level security;

-- класс видят его преподаватель и участники; создаётся класс только через create_class
create policy "classes: видят владелец и участники" on public.classes
  for select to authenticated using (owner_id = (select auth.uid()) or public.is_class_member(id));
create policy "classes: владелец переименовывает" on public.classes
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "classes: владелец удаляет" on public.classes
  for delete to authenticated using (owner_id = (select auth.uid()));

-- менять можно только название: код и владельца не подменить даже своим запросом
revoke update on public.classes from anon, authenticated;
grant update (name) on public.classes to authenticated;

-- участник видит своё членство, преподаватель — весь состав; вступление только через join_class
create policy "class_members: видят сам участник и преподаватель" on public.class_members
  for select to authenticated using (user_id = (select auth.uid()) or public.is_class_owner(class_id));
create policy "class_members: выйти самому или исключить преподавателем" on public.class_members
  for delete to authenticated using (user_id = (select auth.uid()) or public.is_class_owner(class_id));

create policy "assignments: видят преподаватель и участники" on public.assignments
  for select to authenticated using (public.is_class_owner(class_id) or public.is_class_member(class_id));
create policy "assignments: выдаёт преподаватель" on public.assignments
  for insert to authenticated with check (public.is_class_owner(class_id));
create policy "assignments: меняет преподаватель" on public.assignments
  for update to authenticated using (public.is_class_owner(class_id)) with check (public.is_class_owner(class_id));
create policy "assignments: удаляет преподаватель" on public.assignments
  for delete to authenticated using (public.is_class_owner(class_id));

-- ---------------------------------------------------------------- функции

-- Новый класс с уникальным кодом из букв и цифр без похожих символов (нет 0/O и 1/I).
create function public.create_class(p_name text)
returns public.classes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_row public.classes;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if char_length(v_name) = 0 or char_length(v_name) > 80 then
    raise exception 'invalid class name';
  end if;
  if (select count(*) from public.classes c where c.owner_id = v_user) >= 50 then
    raise exception 'too many classes';
  end if;

  loop
    v_code := '';
    for i in 1..6 loop
      -- 32 символа делят 256 нацело, поэтому все символы равновероятны
      v_code := v_code || substr(v_alphabet, 1 + get_byte(extensions.gen_random_bytes(1), 0) % 32, 1);
    end loop;
    exit when not exists (select 1 from public.classes c where c.join_code = v_code);
  end loop;

  insert into public.classes (name, join_code, owner_id)
  values (v_name, v_code, v_user)
  returning * into v_row;
  return v_row;
end;
$$;

-- Вступление по коду. Студент не может просматривать чужие классы, поэтому поиск по коду — на сервере.
create function public.join_class(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_class public.classes;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_class from public.classes c where c.join_code = upper(btrim(coalesce(p_code, '')));
  if v_class.id is null then
    raise exception 'invalid join code';
  end if;

  -- преподаватель не становится участником собственного класса
  if v_class.owner_id <> v_user then
    if (select count(*) from public.class_members m where m.class_id = v_class.id) >= 500 then
      raise exception 'class is full';
    end if;
    insert into public.class_members (class_id, user_id) values (v_class.id, v_user)
    on conflict do nothing;
  end if;
  return v_class.id;
end;
$$;

-- Сводка для преподавателя: имя и раздел progress каждого участника.
-- Наборы данных, история и прочие личные сведения участников наружу не отдаются.
create function public.get_class_progress(p_class_id uuid)
returns table (user_id uuid, display_name text, progress jsonb, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.classes c where c.id = p_class_id and c.owner_id = (select auth.uid())) then
    raise exception 'class not found';
  end if;

  return query
    select m.user_id,
           coalesce(p.display_name, ''),
           coalesce(d.data -> 'progress', '{}'::jsonb),
           d.updated_at
    from public.class_members m
    left join public.profiles p on p.id = m.user_id
    left join public.user_data d on d.user_id = m.user_id
    where m.class_id = p_class_id
    order by lower(coalesce(p.display_name, '')), m.joined_at;
end;
$$;

-- Удаление аккаунта по запросу пользователя (152-ФЗ, ст. 21): вместе с учётной записью
-- каскадом удаляются профиль, облачные данные, членство в классах и собственные классы.
create function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.is_class_owner(uuid) from public, anon;
revoke execute on function public.is_class_member(uuid) from public, anon;
revoke execute on function public.create_class(text) from public, anon;
revoke execute on function public.join_class(text) from public, anon;
revoke execute on function public.get_class_progress(uuid) from public, anon;
revoke execute on function public.delete_account() from public, anon;

grant execute on function public.is_class_owner(uuid) to authenticated;
grant execute on function public.is_class_member(uuid) to authenticated;
grant execute on function public.create_class(text) to authenticated;
grant execute on function public.join_class(text) to authenticated;
grant execute on function public.get_class_progress(uuid) to authenticated;
grant execute on function public.delete_account() to authenticated;

-- ---------------------------------------------------------------- заявки на лицензию

create table public.license_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  organization text not null check (char_length(btrim(organization)) between 2 and 200),
  role text not null default '' check (char_length(role) <= 120),
  email text not null check (char_length(email) <= 254 and email ~ '^\S+@\S+\.\S+$'),
  phone text not null default '' check (char_length(phone) <= 40),
  students text not null default '' check (char_length(students) <= 40),
  message text not null default '' check (char_length(message) <= 4000),
  created_at timestamptz not null default now()
);

alter table public.license_requests enable row level security;

-- заявку может оставить любой посетитель; читать заявки можно только из панели Supabase (service role)
create policy "license_requests: отправить заявку" on public.license_requests
  for insert to anon, authenticated with check (true);
