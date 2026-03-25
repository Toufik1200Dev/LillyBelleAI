import 'dotenv/config';
import { supabaseAdmin } from '../config/supabase';

async function main() {
  const email = 'test@example.com';
  const password = 'password123';
  const fullName = 'Test User';

  console.log('Seeding test user into Supabase...');

  // 1. Create the user in Supabase Auth bypassing email confirmation
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('✅ Test user already exists!');
      return;
    }
    console.error('❌ Failed to create auth user:', authError.message);
    process.exit(1);
  }

  const userId = authData.user.id;

  // 2. Create the user's public profile
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: userId,
    email,
    full_name: fullName,
  });

  if (profileError) {
    console.error('❌ Failed to create user profile:', profileError.message);
    process.exit(1);
  }

  console.log('✅ Test user successfully created!');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
}

main().catch(console.error);
