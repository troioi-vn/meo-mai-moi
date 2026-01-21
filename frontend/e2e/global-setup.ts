import { execSync } from 'child_process'

async function globalSetup() {
  try {
    // Check if we should skip setup (for when using the e2e-test.sh script)
    if (process.env.SKIP_E2E_SETUP === 'true') {
      console.log('⏭️ Skipping E2E setup (SKIP_E2E_SETUP=true)')
      return
    }

    console.log('🗄️ Setting up E2E test database...')

    // Ensure containers are running
    console.log('🐳 Starting Docker containers...')
    execSync('docker compose --profile e2e up -d', { stdio: 'inherit' })

    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...')
    await new Promise((resolve) => setTimeout(resolve, 8000))

    // Check if backend is responsive
    let retries = 0
    const maxRetries = 30
    while (retries < maxRetries) {
      try {
        // Check if the web server responds (not a specific API endpoint)
        execSync('curl -f -I http://localhost:8000 >/dev/null 2>&1', { stdio: 'pipe' })
        break
      } catch {
        retries++
        if (retries >= maxRetries) {
          throw new Error('Backend not responding after 30 attempts')
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    // Setup test database with fresh data
    console.log('🗄️ Setting up test database...')
    execSync('docker compose exec -T backend php artisan migrate:fresh --env=e2e', {
      stdio: 'inherit',
    })
    execSync(
      'docker compose exec -T backend php artisan db:seed --class=E2ETestingSeeder --env=e2e',
      { stdio: 'inherit' }
    )

    // Also ensure test users exist in main database (since web server uses main DB)
    console.log('🗄️ Ensuring test users exist in main database...')
    execSync('docker compose exec -T backend php artisan db:seed --class=UserSeeder --force', {
      stdio: 'inherit',
    })

    console.log('✅ E2E test database setup complete')
    console.log('👤 Test users available:')
    console.log('   - Admin: admin@catarchy.space / password')
    console.log('   - User: user1@catarchy.space / password')
  } catch (error) {
    console.error('❌ Failed to setup E2E test database:', error)
    console.error('💡 Try running: bun run test:e2e instead of bun run e2e:direct')
    throw error
  }
}

export default globalSetup
