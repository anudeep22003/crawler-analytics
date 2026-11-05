begin;
create extension if not exists pgtap with schema extensions;
select plan(6);
insert into auth.users (id) values
    ('00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000002');
insert into public.sites (id, user_id, domain) values
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'example.com'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'example.com');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select lives_ok($$insert into public.installation_checks(site_id)
    values ('10000000-0000-0000-0000-000000000001')$$, 'Owner can create a check');
select is((select count(*) from public.installation_checks where received_at is null and expires_at > now()), 1::bigint, 'Check starts pending and unexpired');
select throws_ok($$insert into public.installation_checks(site_id, received_at)
    values ('10000000-0000-0000-0000-000000000001', now())$$, '42501', null, 'Cannot fabricate a completed check');
select throws_ok($$update public.installation_checks set received_at = now()$$, '42501', null, 'Only collector can update checks');
select throws_ok($$insert into public.installation_checks(site_id)
    values ('10000000-0000-0000-0000-000000000002')$$, '42501', null, 'Cannot request another owners check');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.installation_checks), 0::bigint, 'Other owners cannot read checks');
reset role;
select * from finish();
rollback;
