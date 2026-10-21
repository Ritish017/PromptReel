begin;
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('11111111-1111-4111-8111-111111111111','authenticated','authenticated','promptreel-fixture@example.invalid',now(),'{"provider":"email"}','{}',now(),now()),
('22222222-2222-4222-8222-222222222222','authenticated','authenticated','promptreel-other@example.invalid',now(),'{"provider":"email"}','{}',now(),now());
set local role authenticated;
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","email":"promptreel-fixture@example.invalid"}';
do $test$
begin
 begin perform public.pr_subscribe(false,'test');raise exception 'Consent was incorrectly accepted';exception when raise_exception then if sqlerrm='Consent was incorrectly accepted' then raise;end if;end;
 perform public.pr_subscribe(true,'test');
 if (select count(*) from public.pr_subscriptions)<>1 then raise exception 'Owner subscription unavailable';end if;
 begin insert into public.pr_bookmarks(user_id,entry_id) values('22222222-2222-4222-8222-222222222222','fixture');raise exception 'Cross-owner write accepted';exception when insufficient_privilege then null;end;
 insert into public.pr_bookmarks(user_id,entry_id) values('11111111-1111-4111-8111-111111111111','fixture');
 if (select count(*) from public.pr_bookmarks)<>1 then raise exception 'Owner bookmark failed';end if;
end $test$;
set local request.jwt.claims='{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","email":"promptreel-other@example.invalid"}';
do $test$ begin if (select count(*) from public.pr_subscriptions)<>0 then raise exception 'Cross-owner audience read';end if;if (select count(*) from public.pr_bookmarks)<>0 then raise exception 'Cross-owner library read';end if;end $test$;
set local role anon;
set local request.jwt.claims='{"role":"anon"}';
do $test$
begin
 begin perform email from public.pr_subscriptions;raise exception 'Anonymous audience read';exception when insufficient_privilege then null;end;
 begin perform public.pr_subscribe(true,'test');raise exception 'Anonymous subscription';exception when insufficient_privilege then null;end;
 perform public.pr_public_stats();
end $test$;
rollback;
select 'PASS: consent, owner access, cross-owner isolation, anonymous denial, public aggregates; fixtures rolled back' as result;
