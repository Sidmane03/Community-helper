const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) {
    acc[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
  }
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log('Testing Supabase Connection...');
  const { data, error } = await supabase.from('Issue').select('*').limit(5);
  if (error) {
    console.error('Error fetching issues:', error);
  } else {
    console.log(`Successfully fetched ${data.length} issues.`);
    console.log('Sample data:', JSON.stringify(data, null, 2));
  }
}

run();
