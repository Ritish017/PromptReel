create policy pr_removals_service on public.pr_removals for all to service_role using(true) with check(true);

create function pr_private.verified() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=(select auth.uid()) and email_confirmed_at is not null and coalesce(is_anonymous,false)=false);
$$;
revoke all on function pr_private.verified() from public;
grant execute on function pr_private.verified() to authenticated;
alter policy profile_owner on public.pr_profiles using ((select auth.uid())=user_id and (select pr_private.verified())) with check ((select auth.uid())=user_id and (select pr_private.verified()));
alter policy vote_owner on public.pr_votes using ((select auth.uid())=user_id and (select pr_private.verified())) with check ((select auth.uid())=user_id and (select pr_private.verified()));
alter policy bookmark_owner on public.pr_bookmarks using ((select auth.uid())=user_id and (select pr_private.verified())) with check ((select auth.uid())=user_id and (select pr_private.verified()));
alter policy comment_insert on public.pr_comments with check ((select auth.uid())=user_id and (select pr_private.verified()));
alter policy submission_insert on public.pr_submissions with check ((select auth.uid())=user_id and state='pending' and (select pr_private.verified()));


create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create table pr_private.job_settings(id boolean primary key default true check(id), secret text not null default encode(extensions.gen_random_bytes(32),'hex'));
alter table pr_private.job_settings enable row level security;
revoke all on pr_private.job_settings from public,anon,authenticated;
grant usage on schema pr_private to service_role;
grant select on pr_private.job_settings to service_role;
create policy job_secret_service on pr_private.job_settings for select to service_role using(true);
insert into pr_private.job_settings(id) values(true);
create function public.pr_validate_job_secret(candidate text) returns boolean language sql security invoker set search_path='' as $$ select exists(select 1 from pr_private.job_settings where secret=candidate); $$;
revoke all on function public.pr_validate_job_secret(text) from public,anon,authenticated;
grant execute on function public.pr_validate_job_secret(text) to service_role;
create function public.pr_claim_job(job_name text) returns boolean language sql security invoker set search_path='' as $$
 with claim as (
 insert into public.pr_jobs(job_key,status) values(job_name,'running')
 on conflict(job_key) do update set status='running',updated_at=now()
 where pr_jobs.status='failed' or (pr_jobs.status='running' and pr_jobs.updated_at<now()-interval '15 minutes')
 returning job_key)
 select exists(select 1 from claim);
$$;
revoke all on function public.pr_claim_job(text) from public,anon,authenticated;
grant execute on function public.pr_claim_job(text) to service_role;

select cron.schedule('promptreel-daily-repo-snapshot','30 1 * * *',$job$select net.http_post(url := 'https://uqwolvmvfufjrrhxpxbt.supabase.co/functions/v1/promptreel-jobs', headers := jsonb_build_object('Content-Type','application/json','x-promptreel-job',(select secret from pr_private.job_settings where id)), body := '{"kind":"snapshot"}'::jsonb, timeout_milliseconds := 60000);$job$);
select cron.schedule('promptreel-weekly-editorial-draft','30 4 * * 1',$job$select net.http_post(url := 'https://uqwolvmvfufjrrhxpxbt.supabase.co/functions/v1/promptreel-jobs', headers := jsonb_build_object('Content-Type','application/json','x-promptreel-job',(select secret from pr_private.job_settings where id)), body := '{"kind":"weekly"}'::jsonb, timeout_milliseconds := 60000);$job$);
