<?php

namespace Tests;

use App\Models\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\File;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Set the base URL for tests
        $this->app['config']['app.url'] = 'http://laravel.test';
        $this->app['config']['app.asset_url'] = 'http://laravel.test';

        // Disable email verification requirement by default for Feature tests only
        // to avoid 403 responses from middleware on routes that don't specifically test it.
        // Unit tests should observe the real default (true) unless they override it explicitly.
        $isFeatureTest = str_starts_with(static::class, 'Tests\\Feature\\');
        if ($isFeatureTest) {
            Settings::set('email_verification_required', 'false');
        }

        // Ensure Sanctum treats our test host as stateful so session-based
        // actingAs() works with routes guarded by auth:sanctum.
        $this->app['config']['sanctum.stateful'] = [
            'laravel.test',
            'localhost',
            'localhost:5173',
            '127.0.0.1',
            '127.0.0.1:8000',
            '::1',
        ];
        // Keep session domain unset in tests to use host-only cookies.
        $this->app['config']['session.domain'] = null;
    }

    protected function tearDown(): void
    {
        // Spatie MediaLibrary uses storage_path('media-library/temp') by default.
        // In tests we also point it at storage/framework/testing/media-library/temp.
        // Either way, clean up so the repo doesn't accumulate temp artifacts.
        File::deleteDirectory(storage_path('framework/testing/media-library'));
        File::deleteDirectory(storage_path('media-library'));

        parent::tearDown();
    }
}
