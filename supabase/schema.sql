-- Wave 1: Foundation & Identity (User table and auth trigger)

-- Create a table for public user profiles
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  display_name text,
  points integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on public.users
  for select using (true);

create policy "Users can update their own profile." on public.users
  for update using (auth.uid() = id);

-- Function to handle new user signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, display_name, points)
  values (new.id, new.raw_user_meta_data->>'display_name', 0);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create a profile when a new user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
