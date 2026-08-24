<?php

declare(strict_types=1);

namespace App\Console\DevCommands;

use App\Models\Settings;
use Database\Seeders\E2ETestingSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Wipes the database and reseeds it as a demo/e2e environment.
 *
 * This lives outside app/Console/Commands on purpose. That directory is
 * auto-discovered by the framework; this one is not, so the command only
 * exists when AppServiceProvider registers it, which it declines to do on
 * production. See docs/e2e-ci.md.
 */
class DemoReseedCommand extends Command
{
    protected $signature = 'demo:reseed
        {--initialize : Bootstrap a database that does not carry the sentinel yet}
        {--dry-run : Run every guard and report the verdict without touching data}';

    protected $description = 'Wipe and reseed the demo/e2e database (development only)';

    public function handle(): int
    {
        $verdict = $this->checkGuards();

        if ($verdict !== null) {
            $this->components->error($verdict);

            return self::FAILURE;
        }

        if ($this->option('dry-run')) {
            $this->components->info('All guards passed. No data was touched (--dry-run).');

            return self::SUCCESS;
        }

        $this->components->warn('Dropping every table in '.$this->databaseName().' and reseeding.');

        $this->call('migrate:fresh', ['--force' => true]);
        $this->call('db:seed', ['--class' => E2ETestingSeeder::class, '--force' => true]);

        $this->writeSentinel();

        $this->components->info('Demo environment reseeded.');

        return self::SUCCESS;
    }

    /**
     * Returns a refusal reason, or null when every guard passes.
     *
     * Ordered cheapest first, and worded so the refusal says which layer
     * stopped it rather than leaving someone to guess.
     */
    private function checkGuards(): ?string
    {
        if ($this->getLaravel()->isProduction()) {
            return 'Refusing: the application reports the production environment.';
        }

        // config/app.php defaults APP_ENV to 'production', so a missing or
        // mangled environment lands here rather than sailing past.
        $env = (string) config('app.env');

        if ($env === '' || $env === 'production') {
            return sprintf('Refusing: APP_ENV is "%s".', $env === '' ? '<empty>' : $env);
        }

        if (config('demo.reseed_allowed') !== true) {
            return 'Refusing: DEMO_RESEED_ALLOWED is not true. This opt-in is absent by default and must be set deliberately.';
        }

        $url = rtrim((string) config('app.url'), '/');
        $allowed = array_map(static fn (string $candidate): string => rtrim($candidate, '/'), config('demo.reseed_allowed_urls'));

        if ($url === '' || ! in_array($url, $allowed, true)) {
            return sprintf(
                'Refusing: APP_URL "%s" is not in the reseed allowlist (%s).',
                $url === '' ? '<empty>' : $url,
                implode(', ', $allowed) ?: '<empty>'
            );
        }

        if ($this->option('initialize')) {
            return null;
        }

        if (! $this->hasSentinel()) {
            return 'Refusing: this database does not carry the demo sentinel, so it has never been seeded by this command. '
                .'If it really is a disposable demo database, bootstrap it once with --initialize.';
        }

        return null;
    }

    /**
     * The sentinel is a property of the data, not of the configuration, which
     * is the whole point: it still refuses when every env var is wrong.
     *
     * A missing table means a database this command has never touched, which
     * is exactly the case worth refusing.
     */
    private function hasSentinel(): bool
    {
        try {
            if (! Schema::hasTable('settings')) {
                return false;
            }

            return Settings::query()
                ->where('key', (string) config('demo.sentinel_key'))
                ->where('value', 'true')
                ->exists();
        } catch (Throwable) {
            return false;
        }
    }

    private function writeSentinel(): void
    {
        Settings::updateOrCreate(
            ['key' => (string) config('demo.sentinel_key')],
            ['value' => 'true']
        );

        $this->components->info('Sentinel written: this database is now marked disposable.');
    }

    private function databaseName(): string
    {
        $connection = (string) config('database.default');

        return (string) config("database.connections.{$connection}.database");
    }
}
