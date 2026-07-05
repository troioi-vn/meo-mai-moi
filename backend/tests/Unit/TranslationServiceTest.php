<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Settings;
use App\Services\Translation\TranslationService;
use App\Services\Translation\TranslationSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Mockery;
use MoeMizrak\LaravelOpenrouter\DTO\ErrorData;
use MoeMizrak\LaravelOpenrouter\DTO\MessageData;
use MoeMizrak\LaravelOpenrouter\DTO\NonStreamingChoiceData;
use MoeMizrak\LaravelOpenrouter\DTO\ResponseData;
use MoeMizrak\LaravelOpenrouter\DTO\UsageData;
use RuntimeException;
use Tests\TestCase;

class TranslationServiceTest extends TestCase
{
    use RefreshDatabase;

    private TranslationSettingsService $settingsService;

    private TranslationService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->settingsService = app(TranslationSettingsService::class);
        $this->service = app(TranslationService::class);

        $this->settingsService->save(
            model: 'openai/gpt-4o-mini',
            promptTemplate: 'Translate to Vietnamese: {text}',
            sourceLanguage: 'en',
            apiKey: 'sk-test-key',
        );
    }

    public function test_test_returns_error_when_text_is_empty(): void
    {
        $result = $this->service->test('   ');

        $this->assertFalse($result['success']);
        $this->assertNull($result['translation']);
        $this->assertSame('Test text is required.', $result['error']);
    }

    public function test_test_returns_error_when_api_key_missing(): void
    {
        Settings::query()->where('key', 'translation.openrouter_api_key')->delete();
        Cache::forget('settings.translation.openrouter_api_key');
        Config::set('laravel-openrouter.api_key', null);

        $result = $this->service->test('Hello');

        $this->assertFalse($result['success']);
        $this->assertSame('OpenRouter API key is not configured.', $result['error']);
    }

    public function test_test_returns_error_when_prompt_missing_text_placeholder(): void
    {
        $result = $this->service->test(
            text: 'Hello',
            promptTemplate: 'Translate this without a placeholder',
        );

        $this->assertFalse($result['success']);
        $this->assertSame('Prompt template must contain the {text} placeholder.', $result['error']);
    }

    public function test_test_handles_raw_array_choices_from_openrouter(): void
    {
        $client = Mockery::mock();
        $client->shouldReceive('chatRequest')
            ->once()
            ->andReturn(new ResponseData(
                id: 'gen-test',
                model: 'openai/gpt-4o-mini',
                object: 'chat.completion',
                created: 1_700_000_000,
                choices: [
                    [
                        'index' => 0,
                        'message' => [
                            'role' => 'assistant',
                            'content' => 'Xin chào',
                        ],
                        'finish_reason' => 'stop',
                    ],
                ],
            ));

        $this->app->instance('laravel-openrouter', $client);

        $result = $this->service->test('Hello');

        $this->assertTrue($result['success']);
        $this->assertSame('Xin chào', $result['translation']);
    }

    public function test_test_handles_multipart_message_content(): void
    {
        $client = Mockery::mock();
        $client->shouldReceive('chatRequest')
            ->once()
            ->andReturn(new ResponseData(
                id: 'gen-test',
                model: 'openai/gpt-4o-mini',
                object: 'chat.completion',
                created: 1_700_000_000,
                choices: [
                    [
                        'index' => 0,
                        'message' => [
                            'role' => 'assistant',
                            'content' => [
                                ['type' => 'text', 'text' => 'Xin chào'],
                            ],
                        ],
                        'finish_reason' => 'stop',
                    ],
                ],
            ));

        $this->app->instance('laravel-openrouter', $client);

        $result = $this->service->test('Hello');

        $this->assertTrue($result['success']);
        $this->assertSame('Xin chào', $result['translation']);
    }

    public function test_test_returns_translation_on_success(): void
    {
        $client = Mockery::mock();
        $client->shouldReceive('chatRequest')
            ->once()
            ->andReturn(new ResponseData(
                id: 'gen-test',
                model: 'openai/gpt-4o-mini',
                object: 'chat.completion',
                created: 1_700_000_000,
                provider: 'OpenAI',
                choices: [
                    [
                        'index' => 0,
                        'message' => [
                            'role' => 'assistant',
                            'content' => 'Xin chào',
                        ],
                        'finish_reason' => 'stop',
                    ],
                ],
                usage: new UsageData(
                    prompt_tokens: 42,
                    completion_tokens: 7,
                    total_tokens: 49,
                    cost: 0.00012,
                ),
            ));

        $this->app->instance('laravel-openrouter', $client);

        $result = $this->service->test('Hello');

        $this->assertTrue($result['success']);
        $this->assertSame('Xin chào', $result['translation']);
        $this->assertNull($result['error']);
        $this->assertIsArray($result['meta']);
        $this->assertSame(42, $result['meta']['prompt_tokens']);
        $this->assertSame(7, $result['meta']['completion_tokens']);
        $this->assertSame(49, $result['meta']['total_tokens']);
        $this->assertSame('gen-test', $result['meta']['request_id']);
        $this->assertSame('OpenAI', $result['meta']['provider']);
        $this->assertSame('stop', $result['meta']['finish_reason']);
        $this->assertStringContainsString('Prompt tokens: 42', $this->service->formatResponseMeta($result['meta']));
    }

    public function test_test_returns_error_from_openrouter(): void
    {
        $client = Mockery::mock();
        $client->shouldReceive('chatRequest')
            ->once()
            ->andReturn(new ErrorData(code: 401, message: 'Invalid API key'));

        $this->app->instance('laravel-openrouter', $client);

        $result = $this->service->test('Hello');

        $this->assertFalse($result['success']);
        $this->assertSame('Invalid API key', $result['error']);
    }

    public function test_test_uses_form_overrides_without_saving(): void
    {
        $client = Mockery::mock();
        $client->shouldReceive('chatRequest')
            ->once()
            ->withArgs(function ($chatData): bool {
                return $chatData->model === 'openai/gpt-4o';
            })
            ->andReturn(new ResponseData(
                id: 'gen-test',
                model: 'openai/gpt-4o',
                object: 'chat.completion',
                created: 1_700_000_000,
                choices: [
                    new NonStreamingChoiceData(
                        message: new MessageData(content: 'Привет', role: 'assistant'),
                    ),
                ],
            ));

        $this->app->instance('laravel-openrouter', $client);

        $result = $this->service->test(
            text: 'Hello',
            model: 'openai/gpt-4o',
            promptTemplate: 'Translate to Russian: {text}',
            sourceLanguage: 'en',
        );

        $this->assertTrue($result['success']);
        $this->assertSame('Привет', $result['translation']);
        $this->assertSame('openai/gpt-4o-mini', $this->settingsService->getModel());
    }

    public function test_test_substitutes_source_language_in_prompt(): void
    {
        $sourceLanguageLabel = $this->settingsService->formatSourceLanguageLabel('uk');

        $client = Mockery::mock();
        $client->shouldReceive('chatRequest')
            ->once()
            ->withArgs(function ($chatData) use ($sourceLanguageLabel): bool {
                $content = $chatData->messages[0]->content ?? '';

                return is_string($content) && str_contains($content, "The input text is in {$sourceLanguageLabel}.");
            })
            ->andReturn(new ResponseData(
                id: 'gen-test',
                model: 'openai/gpt-4o-mini',
                object: 'chat.completion',
                created: 1_700_000_000,
                choices: [
                    new NonStreamingChoiceData(
                        message: new MessageData(content: 'Translated', role: 'assistant'),
                    ),
                ],
            ));

        $this->app->instance('laravel-openrouter', $client);

        $result = $this->service->test(
            text: 'Hello',
            promptTemplate: 'The input text is in {source_language}. Text: {text}',
            sourceLanguage: 'uk',
        );

        $this->assertTrue($result['success']);
        $this->assertSame('Translated', $result['translation']);
    }

    public function test_parse_tagged_translations_returns_expected_locale_map(): void
    {
        $translations = $this->service->parseTaggedTranslations(
            "<en>A black cat is sleeping on the sofa.</en>\n<ru>Черный кот спит на диване.</ru>\n<uk>Чорний кіт спить на дивані.</uk>",
            ['en', 'ru', 'uk'],
        );

        $this->assertSame('A black cat is sleeping on the sofa.', $translations['en']);
        $this->assertSame('Черный кот спит на диване.', $translations['ru']);
        $this->assertSame('Чорний кіт спить на дивані.', $translations['uk']);
    }

    public function test_parse_tagged_translations_rejects_incomplete_response(): void
    {
        $this->expectException(RuntimeException::class);

        $this->service->parseTaggedTranslations('<en>A black cat is sleeping on the sofa.</en>', ['en', 'ru']);
    }
}
