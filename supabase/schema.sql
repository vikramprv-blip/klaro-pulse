-- Journey definitions: what to test and how
create table if not exists journeys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal text not null,
  target_url text not null,
  steps jsonb not null default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Each time a journey is triggered
create table if not exists test_runs (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid references journeys(id),
  triggered_by text default 'github-push',
  commit_sha text,
  status text default 'pending',
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Each step result inside a run
create table if not exists step_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references test_runs(id),
  step_index integer not null,
  step_description text,
  status text not null,
  ai_reasoning text,
  screenshot_url text,
  error_message text,
  duration_ms integer,
  created_at timestamptz default now()
);

-- Final outcome per run
create table if not exists outcomes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references test_runs(id) unique,
  journey_id uuid references journeys(id),
  passed boolean not null,
  total_steps integer,
  passed_steps integer,
  failed_steps integer,
  summary text,
  created_at timestamptz default now()
);

-- Enable RLS but allow service role full access
alter table journeys enable row level security;
alter table test_runs enable row level security;
alter table step_results enable row level security;
alter table outcomes enable row level security;

create policy "service role full access" on journeys for all using (true);
create policy "service role full access" on test_runs for all using (true);
create policy "service role full access" on step_results for all using (true);
create policy "service role full access" on outcomes for all using (true);

-- Seed one example journey
insert into journeys (name, goal, target_url, steps) values (
  'User Login Flow',
  'Verify a user can log in with valid credentials and reach the dashboard',
  'https://your-app.com',
  '[
    {"action": "navigate", "description": "Go to login page"},
    {"action": "type", "selector": "input[type=email]", "value": "test@example.com", "description": "Enter email"},
    {"action": "type", "selector": "input[type=password]", "value": "testpassword", "description": "Enter password"},
    {"action": "click", "description": "Click the login button"},
    {"action": "assert", "description": "Confirm dashboard is visible"}
  ]'
);
