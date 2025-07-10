<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Set the base URL for tests
        $this->app['config']['app.url'] = 'http://laravel.test';
        $this->app['config']['app.asset_url'] = 'http://laravel.test';
    }
}