-- Up to three times a day to push "N things pending today" to your phone.
-- Only sent when something is still open; an empty array turns them off.
alter table public.profiles
  add column nudge_times time[] not null default '{09:00,14:00,20:00}'
    check (coalesce(array_length(nudge_times, 1), 0) <= 3);
