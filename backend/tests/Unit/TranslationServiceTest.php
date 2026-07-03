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
                choices: [
                    new NonStreamingChoiceData(
                        message: new MessageData(content: 'Xin chào', role: 'assistant'),
                    ),
                ],
            ));

        $this->app->instance('laravel-openrouter', $client);

        $result = $this->service->test('Hello');

        $this->assertTrue($result['success']);
        $this->assertSame('Xin chào', $result['translation']);
        $this->assertNull($result['error']);
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
        );

        $this->assertTrue($result['success']);
        $this->assertSame('Привет', $result['translation']);
        $this->assertSame('openai/gpt-4o-mini', $this->settingsService->getModel());
    }
}
