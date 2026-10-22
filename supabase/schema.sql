create schema if not exists pr_private;
revoke all on schema pr_private from public, anon, authenticated;
grant usage on schema pr_private to authenticated;
create table public.pr_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check (length(display_name)<=80),
 created_at timestamptz not null default now()
);
create table public.pr_subscriptions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null unique,
 state text not null check (state in ('active','unsubscribed')),
 consent_at timestamptz not null default now(),
 consent_version text not null default 'newsletter-free-v1',
 source text not null default 'site' check (length(source)<=40),
 unsubscribe_token uuid not null unique default gen_random_uuid(),
 updated_at timestamptz not null default now()
);
create table public.pr_votes (
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_id text not null check (entry_id ~ '^[a-zA-Z0-9_:-]{1,80}$'),
 value smallint not null check (value in (-1,1)),
 primary key(user_id,entry_id)
);
create table public.pr_comments (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_id text not null check (entry_id ~ '^[a-zA-Z0-9_:-]{1,80}$'),
 author_name text not null check(length(author_name) between 1 and 80),
 body text not null check(length(body) between 2 and 600),
 created_at timestamptz not null default now()
);
create index pr_comments_entry_time on public.pr_comments(entry_id,created_at desc);
create index pr_comments_user_time on public.pr_comments(user_id,created_at desc);
create table public.pr_bookmarks (
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_id text not null check(length(entry_id) between 1 and 100),
 created_at timestamptz not null default now(),
 primary key(user_id,entry_id)
);
create table public.pr_issues (
 id text primary key check(id ~ '^[a-z0-9-]{1,80}$'),
 subject text not null,
 content jsonb not null,
 status text not null default 'draft' check(status in ('draft','approved','published')),
 created_at timestamptz not null default now(),
 published_at timestamptz
);
create table public.pr_deliveries (
 issue_id text not null references public.pr_issues(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null check(status in ('reserved','sent','failed','suppressed')),
 provider_id text,
 updated_at timestamptz not null default now(),
 primary key(issue_id,user_id)
);
create index pr_deliveries_user on public.pr_deliveries(user_id);
create table public.pr_repo_snapshots (
 repo text not null, captured_on date not null default current_date,
 stars integer not null check(stars>=0), description text not null default '',
 primary key(repo,captured_on)
);
create table public.pr_jobs (
 job_key text primary key, status text not null check(status in ('running','succeeded','failed')),
 summary jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table public.pr_submissions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 post_url text not null check(length(post_url)<=500),
 prompt_text text not null check(length(prompt_text) between 2 and 12000),
 permission_confirmed boolean not null check(permission_confirmed),
 state text not null default 'pending' check(state in ('pending','approved','rejected','removed')),
 created_at timestamptz not null default now()
);
create index pr_submissions_user on public.pr_submissions(user_id);
create table public.pr_removals (source_id text primary key, reason text not null, created_at timestamptz not null default now());
create or replace function pr_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=(select auth.uid()) and email='kurmaritish017@gmail.com' and email_confirmed_at is not null);
$$;
revoke all on function pr_private.is_admin() from public;
grant execute on function pr_private.is_admin() to authenticated;
do $block$
declare t text;
begin
 foreach t in array array['pr_profiles','pr_subscriptions','pr_votes','pr_comments','pr_bookmarks','pr_issues','pr_deliveries','pr_repo_snapshots','pr_jobs','pr_submissions','pr_removals'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $block$;
grant select,insert,update on public.pr_profiles to authenticated;
create policy profile_owner on public.pr_profiles for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select on public.pr_subscriptions to authenticated;
create policy subscription_owner on public.pr_subscriptions for select to authenticated using ((select auth.uid())=user_id or (select pr_private.is_admin()));
grant select,insert,update,delete on public.pr_votes, public.pr_bookmarks to authenticated;
create policy vote_owner on public.pr_votes for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy bookmark_owner on public.pr_bookmarks for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select(id,entry_id,author_name,body,created_at) on public.pr_comments to anon,authenticated;
grant insert(user_id,entry_id,author_name,body) on public.pr_comments to authenticated;
create policy comment_public on public.pr_comments for select to anon,authenticated using(true);
create policy comment_insert on public.pr_comments for insert to authenticated with check ((select auth.uid())=user_id);
create function pr_private.limit_comments() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select count(*) from public.pr_comments where user_id=new.user_id and created_at>now()-interval '1 minute')>=3 then raise exception 'Please wait before commenting again'; end if;
 return new;
end $$;
revoke all on function pr_private.limit_comments() from public;
create trigger pr_comment_rate before insert on public.pr_comments for each row execute function pr_private.limit_comments();
grant select,insert on public.pr_submissions to authenticated;
create policy submission_owner on public.pr_submissions for select to authenticated using ((select auth.uid())=user_id or (select pr_private.is_admin()));
create policy submission_insert on public.pr_submissions for insert to authenticated with check ((select auth.uid())=user_id and state='pending');
grant select on public.pr_issues to anon,authenticated;
create policy issue_published on public.pr_issues for select to anon,authenticated using(status='published');
grant insert,update on public.pr_issues to authenticated;
create policy issue_admin on public.pr_issues for all to authenticated using((select pr_private.is_admin())) with check((select pr_private.is_admin()));
grant select on public.pr_jobs, public.pr_deliveries to authenticated;
create policy job_admin on public.pr_jobs for select to authenticated using((select pr_private.is_admin()));
create policy delivery_admin on public.pr_deliveries for select to authenticated using((select pr_private.is_admin()));
grant select on public.pr_repo_snapshots to anon,authenticated;
create policy snapshot_public on public.pr_repo_snapshots for select to anon,authenticated using(true);
create function pr_private.subscribe(consent boolean, source_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); address text;
begin
 if uid is null or consent is distinct from true then raise exception 'Verified sign-in and newsletter consent required'; end if;
 select email into address from auth.users where id=uid and email_confirmed_at is not null;
 if address is null then raise exception 'Confirm your email first'; end if;
 insert into public.pr_subscriptions(user_id,email,state,source) values(uid,lower(address),'active',left(coalesce(source_name,'site'),40))
 on conflict(user_id) do update set email=excluded.email,state='active',consent_at=now(),consent_version='newsletter-free-v1',source=excluded.source,updated_at=now();
 return jsonb_build_object('ok',true,'state','active');
end $$;
revoke all on function pr_private.subscribe(boolean,text) from public;
grant execute on function pr_private.subscribe(boolean,text) to authenticated;
create function public.pr_subscribe(consent boolean, source_name text default 'site') returns jsonb language sql security invoker set search_path='' as $$ select pr_private.subscribe(consent,source_name); $$;
revoke all on function public.pr_subscribe(boolean,text) from public,anon;
grant execute on function public.pr_subscribe(boolean,text) to authenticated;
create function pr_private.unsubscribe(token uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.pr_subscriptions set state='unsubscribed',updated_at=now() where unsubscribe_token=token;
 return found;
end $$;
revoke all on function pr_private.unsubscribe(uuid) from public;
grant usage on schema pr_private to anon;
grant execute on function pr_private.unsubscribe(uuid) to anon,authenticated;
create function public.pr_unsubscribe(token uuid) returns boolean language sql security invoker set search_path='' as $$ select pr_private.unsubscribe(token); $$;
revoke all on function public.pr_unsubscribe(uuid) from public;
grant execute on function public.pr_unsubscribe(uuid) to anon,authenticated;
create function pr_private.stats() returns jsonb language sql stable security definer set search_path='' as $$
 with ids as (select entry_id from public.pr_votes union select entry_id from public.pr_comments),
 v as (select entry_id,count(*) filter(where value=1) u,count(*) filter(where value=-1) d from public.pr_votes group by entry_id),
 c as (select entry_id,count(*) c from public.pr_comments group by entry_id)
 select coalesce(jsonb_object_agg(ids.entry_id,jsonb_build_object('u',coalesce(v.u,0),'d',coalesce(v.d,0),'c',coalesce(c.c,0))),'{}') from ids left join v using(entry_id) left join c using(entry_id);
$$;
revoke all on function pr_private.stats() from public;
grant execute on function pr_private.stats() to anon,authenticated;
create function public.pr_public_stats() returns jsonb language sql stable security invoker set search_path='' as $$ select pr_private.stats(); $$;
revoke all on function public.pr_public_stats() from public;
grant execute on function public.pr_public_stats() to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('promptreel-private','promptreel-private',false,5242880,array['image/png','image/jpeg','image/webp','text/html','application/json']) on conflict(id) do nothing;
create policy pr_asset_admin on storage.objects for all to authenticated using(bucket_id='promptreel-private' and (select pr_private.is_admin())) with check(bucket_id='promptreel-private' and (select pr_private.is_admin()));
