<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Filament\Pages\TranslationSettings;
use App\Models\User;
use App\Services\Translation\TranslationService;
use App\Services\Translation\TranslationSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Mockery;
use Tests\TestCase;

class TranslationSettingsPageTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);

        $this->superAdmin = User::factory()->create([
            'email' => 'superadmin@test.com',
        ]);
        $this->superAdmin->assignRole('super_admin');
    }

    public function test_super_admin_can_access_translation_settings_page(): void
    {
        $this->actingAs($this->superAdmin);

        Livewire::test(TranslationSettings::class)
            ->assertSuccessful();
    }

    public function test_non_super_admin_cannot_access_translation_settings_page(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $this->actingAs($user);

        $this->get('/admin/translation-settings')
            ->assertForbidden();
    }

    public function test_super_admin_can_save_translation_settings(): void
    {
        $this->actingAs($this->superAdmin);

        Livewire::test(TranslationSettings::class)
            ->fillForm([
                'api_key' => 'sk-admin-test-key',
                'model' => 'openai/gpt-4o',
                'source_language' => 'uk',
                'prompt_template' => 'Translate to Ukrainian: {text}',
            ])
            ->callAction('save')
            ->assertHasNoActionErrors();

        $settingsService = app(TranslationSettingsService::class);

        $this->assertSame('sk-admin-test-key', $settingsService->getApiKey());
        $this->assertSame('openai/gpt-4o', $settingsService->getModel());
        $this->assertSame('uk', $settingsService->getSourceLanguage());
        $this->assertSame('Translate to Ukrainian: {text}', $settingsService->getPromptTemplate());

        Livewire::test(TranslationSettings::class)
            ->assertSet('data.api_key', '')
            ->assertSet('data.api_key_display', $settingsService->getMaskedApiKey());
    }

    public function test_save_rejects_prompt_without_text_placeholder(): void
    {
        $this->actingAs($this->superAdmin);

        Livewire::test(TranslationSettings::class)
            ->fillForm([
                'api_key' => 'sk-admin-test-key',
                'model' => 'openai/gpt-4o-mini',
                'source_language' => 'en',
                'prompt_template' => 'Translate without placeholder',
            ])
            ->callAction('save');

        $settingsService = app(TranslationSettingsService::class);

        $this->assertFalse($settingsService->hasApiKey());
    }

    public function test_run_test_action_displays_translation_result(): void
    {
        $this->actingAs($this->superAdmin);

        $mock = Mockery::mock(TranslationService::class);
        $mock->shouldReceive('test')
            ->once()
            ->andReturn([
                'success' => true,
                'translation' => 'Xin chào',
                'error' => null,
            ]);

        $this->app->instance(TranslationService::class, $mock);

        Livewire::test(TranslationSettings::class)
            ->fillForm([
                'test_text' => 'Hello',
                'model' => 'openai/gpt-4o-mini',
                'source_language' => 'en',
                'prompt_template' => 'Translate to Vietnamese: {text}',
                'api_key' => 'sk-test',
            ])
            ->callFormComponentAction('testTranslation', 'runTest')
            ->assertSet('data.test_result', 'Xin chào');
    }

    public function test_run_test_action_shows_error_notification_on_failure(): void
    {
        $this->actingAs($this->superAdmin);

        $mock = Mockery::mock(TranslationService::class);
        $mock->shouldReceive('test')
            ->once()
            ->andReturn([
                'success' => false,
                'translation' => null,
                'error' => 'Invalid API key',
            ]);

        $this->app->instance(TranslationService::class, $mock);

        Livewire::test(TranslationSettings::class)
            ->fillForm([
                'test_text' => 'Hello',
                'model' => 'openai/gpt-4o-mini',
                'source_language' => 'en',
                'prompt_template' => 'Translate to Vietnamese: {text}',
            ])
            ->callFormComponentAction('testTranslation', 'runTest')
            ->assertSet('data.test_result', '');
    }

    public function test_save_rejects_invalid_source_language(): void
    {
        $this->actingAs($this->superAdmin);

        Livewire::test(TranslationSettings::class)
            ->fillForm([
                'api_key' => 'sk-admin-test-key',
                'model' => 'openai/gpt-4o-mini',
                'source_language' => 'fr',
                'prompt_template' => 'Translate: {text}',
            ])
            ->callAction('save');

        $settingsService = app(TranslationSettingsService::class);

        $this->assertFalse($settingsService->hasApiKey());
    }

    public function test_page_loads_default_source_language_and_test_text(): void
    {
        $this->actingAs($this->superAdmin);

        Livewire::test(TranslationSettings::class)
            ->assertSet('data.source_language', 'en')
            ->assertSet(
                'data.test_text',
                (string) config('translation.default_test_text'),
            );
    }
}
