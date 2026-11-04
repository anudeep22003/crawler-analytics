begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- Disposable identities for database policy tests; everything rolls back.
insert into auth.users (id) values
    ('00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select lives_ok($$insert into public.sites (user_id, domain)
    values (auth.uid(), 'example.com')$$, 'Owner can add a site');
select throws_ok($$insert into public.sites (user_id, domain)
    values (auth.uid(), 'example.com')$$, '23505', null, 'Duplicate is rejected');
select throws_ok($$insert into public.sites (user_id, domain)
    values (auth.uid(), 'Example.com')$$, '23514', null, 'Noncanonical domain is rejected');
select throws_ok($$insert into public.sites (user_id, domain)
    values ('00000000-0000-0000-0000-000000000002', 'other.com')$$,
    '42501', null, 'Cannot insert for another owner');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.sites), 0::bigint, 'Other owner cannot read sites');
select lives_ok($$insert into public.sites (user_id, domain)
    values (auth.uid(), 'example.com')$$, 'Different owners may use the same domain');

set local role anon;
select throws_ok($$select * from public.sites$$, '42501', null, 'Anonymous reads are denied');
reset role;
select * from finish();
rollback;
