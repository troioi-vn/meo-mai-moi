<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Settings;
use App\Services\Translation\TranslationSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TranslationSettingsServiceTest extends TestCase
{
    use RefreshDatabase;

    private TranslationSettingsService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(TranslationSettingsService::class);
    }

    public function test_encrypts_and_decrypts_api_key(): void
    {
        $this->service->save(
            model: 'openai/gpt-4o-mini',
            promptTemplate: 'Translate: {text}',
            sourceLanguage: 'en',
            apiKey: 'sk-test-secret-key',
        );

        $this->assertSame('sk-test-secret-key', $this->service->getApiKey());
        $this->assertTrue($this->service->hasApiKey());

        $stored = Settings::get('translation.openrouter_api_key');
        $this->assertIsString($stored);
        $this->assertNotSame('sk-test-secret-key', $stored);
    }

    public function test_keeps_existing_api_key_when_saving_without_new_key(): void
    {
        $this->service->save(
            model: 'openai/gpt-4o-mini',
            promptTemplate: 'Translate: {text}',
            sourceLanguage: 'en',
            apiKey: 'sk-existing-key',
        );

        $this->service->save(
            model: 'openai/gpt-4o',
            promptTemplate: 'Updated: {text}',
            sourceLanguage: 'vi',
            apiKey: null,
        );

        $this->assertSame('sk-existing-key', $this->service->getApiKey());
        $this->assertSame('openai/gpt-4o', $this->service->getModel());
        $this->assertSame('Updated: {text}', $this->service->getPromptTemplate());
        $this->assertSame('vi', $this->service->getSourceLanguage());
    }

    public function test_build_prompt_substitutes_text_placeholder(): void
    {
        $this->service->save(
            model: 'openai/gpt-4o-mini',
            promptTemplate: 'Translate to Vietnamese: {text}',
            sourceLanguage: 'en',
            apiKey: 'sk-test',
        );

        $this->assertSame(
            'Translate to Vietnamese: Hello world',
            $this->service->buildPrompt('Hello world'),
        );
    }

    public function test_get_masked_api_key_hides_middle_of_key(): void
    {
        $this->service->save(
            model: 'openai/gpt-4o-mini',
            promptTemplate: 'Translate: {text}',
            sourceLanguage: 'en',
            apiKey: 'sk-abcdefghijklmnop',
        );

        $masked = $this->service->getMaskedApiKey();

        $this->assertStringStartsWith('sk-abc', $masked);
        $this->assertStringEndsWith('mnop', $masked);
        $this->assertStringContainsString('...', $masked);
    }

    public function test_returns_default_model_and_prompt_when_not_configured(): void
    {
        $this->assertSame('openai/gpt-4o-mini', $this->service->getModel());
        $this->assertSame('en', $this->service->getSourceLanguage());
        $this->assertStringContainsString('{text}', $this->service->getPromptTemplate());
        $this->assertStringContainsString('{source_language}', $this->service->getPromptTemplate());
    }

    public function test_apply_runtime_config_sets_laravel_openrouter_api_key(): void
    {
        $this->service->save(
            model: 'openai/gpt-4o-mini',
            promptTemplate: 'Translate: {text}',
            sourceLanguage: 'en',
            apiKey: 'sk-runtime-key',
        );

        $this->service->applyRuntimeConfig();

        $this->assertSame('sk-runtime-key', config('laravel-openrouter.api_key'));
    }

    public function test_invalid_encrypted_api_key_returns_null(): void
    {
        Settings::set('translation.openrouter_api_key', 'not-valid-encrypted-data');

        $this->assertNull($this->service->getApiKey());
        $this->assertFalse($this->service->hasApiKey());
    }

    public function test_is_allowed_model_rejects_unknown_models(): void
    {
        $this->assertTrue($this->service->isAllowedModel('openai/gpt-4o-mini'));
        $this->assertFalse($this->service->isAllowedModel('unknown/model'));
    }

    public function test_build_prompt_substitutes_source_language_placeholder(): void
    {
        $this->service->save(
            model: 'openai/gpt-4o-mini',
            promptTemplate: 'Translate from {source_language}: {text}',
            sourceLanguage: 'vi',
            apiKey: 'sk-test',
        );

        $this->assertSame(
            'Translate from '.$this->service->formatSourceLanguageLabel('vi').': Hello world',
            $this->service->buildPrompt('Hello world'),
        );
    }

    public function test_build_prompt_uses_source_language_override(): void
    {
        $this->service->save(
            model: 'openai/gpt-4o-mini',
            promptTemplate: 'Translate from {source_language}: {text}',
            sourceLanguage: 'en',
            apiKey: 'sk-test',
        );

        $this->assertSame(
            'Translate from '.$this->service->formatSourceLanguageLabel('uk').': Hello world',
            $this->service->buildPrompt('Hello world', sourceLanguage: 'uk'),
        );
    }

    public function test_is_allowed_source_language_rejects_unknown_locales(): void
    {
        $this->assertTrue($this->service->isAllowedSourceLanguage('en'));
        $this->assertFalse($this->service->isAllowedSourceLanguage('fr'));
    }
}
