create function public.site_activity(
    p_site_id uuid,
    p_period text,
    p_end timestamptz default now()
) returns jsonb
language plpgsql stable security invoker
set search_path = ''
set timezone = 'UTC'
as $$
declare
    window_size interval;
    bucket_size interval;
    window_start timestamptz;
    result jsonb;
begin
    if p_period is null or p_period not in ('24h', '7d', '30d') or p_end is null then
        raise exception 'Expected 24h, 7d, or 30d and a non-null end time'
            using errcode = '22023';
    end if;

    window_size := case p_period
        when '24h' then interval '24 hours'
        when '7d' then interval '7 days'
        else interval '30 days' end;
    bucket_size := case p_period
        when '24h' then interval '1 hour' else interval '1 day' end;
    window_start := p_end - window_size;

    -- Aggregate once within [start, end). RLS applies as the signed-in caller.
    with counts as (
        select date_bin(bucket_size, timestamp, window_start) as bucket_start,
            count(*) as visits
        from public.crawler_events
        where site_id = p_site_id and timestamp >= window_start and timestamp < p_end
        group by 1
    ), timeline as (
        select buckets.bucket_start, coalesce(counts.visits, 0) as visits
        from generate_series(window_start, p_end - bucket_size, bucket_size)
            as buckets(bucket_start)
        left join counts using (bucket_start)
    )
    select jsonb_build_object(
        'start', window_start,
        'end', p_end,
        'total', coalesce(sum(visits), 0),
        'timeline', jsonb_agg(jsonb_build_object(
            'bucket_start', bucket_start, 'visits', visits
        ) order by bucket_start)
    ) into result from timeline;

    return result;
end;
$$;

revoke all on function public.site_activity(uuid, text, timestamptz) from public, anon;
grant execute on function public.site_activity(uuid, text, timestamptz) to authenticated;
