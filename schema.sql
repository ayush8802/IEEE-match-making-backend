-- Create a table to store chat messages
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users(id) not null,
  receiver_email text not null, -- Using email since researchers might not be registered users yet
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.messages enable row level security;

-- Allow users to view their own messages (sent or received)
create policy "Users can view their own messages"
  on public.messages for select
  using (auth.uid() = sender_id OR receiver_email = (select email from auth.users where id = auth.uid()));

-- Allow users to insert messages where they are the sender
create policy "Users can insert their own messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);
