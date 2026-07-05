<?php

declare(strict_types=1);

namespace App\Services\Translation;

use GuzzleHttp\ClientInterface;
use MoeMizrak\LaravelOpenrouter\DTO\ChatData;
use MoeMizrak\LaravelOpenrouter\DTO\ChoiceData;
use MoeMizrak\LaravelOpenrouter\DTO\ErrorData;
use MoeMizrak\LaravelOpenrouter\DTO\MessageData;
use MoeMizrak\LaravelOpenrouter\DTO\NonStreamingChoiceData;
use MoeMizrak\LaravelOpenrouter\DTO\ResponseData;
use MoeMizrak\LaravelOpenrouter\DTO\TextContentData;
use MoeMizrak\LaravelOpenrouter\DTO\UsageData;
use MoeMizrak\LaravelOpenrouter\Facades\LaravelOpenRouter;
use Throwable;

class TranslationService
{
    public function __construct(
        private readonly TranslationSettingsService $settingsService,
    ) {}

    /**
     * @return array{success: bool, translation: ?string, error: ?string, meta: ?array<string, mixed>}
     */
    public function test(
        string $text,
        ?string $apiKey = null,
        ?string $model = null,
        ?string $promptTemplate = null,
        ?string $sourceLanguage = null,
    ): array {
        $text = trim($text);

        if ($text === '') {
            return [
                'success' => false,
                'translation' => null,
                'error' => 'Test text is required.',
                'meta' => null,
            ];
        }

        $apiKeyToUse = ($apiKey !== null && $apiKey !== '') ? $apiKey : $this->settingsService->getApiKey();

        if ($apiKeyToUse === null || $apiKeyToUse === '') {
            return [
                'success' => false,
                'translation' => null,
                'error' => 'OpenRouter API key is not configured.',
                'meta' => null,
            ];
        }

        $modelToUse = ($model !== null && $model !== '') ? $model : $this->settingsService->getModel();

        if (! $this->settingsService->isAllowedModel($modelToUse)) {
            return [
                'success' => false,
                'translation' => null,
                'error' => 'Selected model is not allowed.',
                'meta' => null,
            ];
        }

        $templateToUse = ($promptTemplate !== null && $promptTemplate !== '')
            ? $promptTemplate
            : $this->settingsService->getPromptTemplate();

        if (! str_contains($templateToUse, '{text}')) {
            return [
                'success' => false,
                'translation' => null,
                'error' => 'Prompt template must contain the {text} placeholder.',
                'meta' => null,
            ];
        }

        try {
            $this->settingsService->applyRuntimeConfig($apiKeyToUse);
            $this->refreshOpenRouterClient();

            $prompt = $this->settingsService->buildPrompt($text, $templateToUse, $sourceLanguage);

            $chatData = new ChatData(
                messages: [
                    new MessageData(content: $prompt, role: 'user'),
                ],
                model: $modelToUse,
            );

            $response = LaravelOpenRouter::chatRequest($chatData);

            if ($response instanceof ErrorData) {
                return [
                    'success' => false,
                    'translation' => null,
                    'error' => $response->message,
                    'meta' => null,
                ];
            }

            $translation = $this->extractTranslation($response);

            if ($translation === null || trim($translation) === '') {
                return [
                    'success' => false,
                    'translation' => null,
                    'error' => 'OpenRouter returned an empty translation.',
                    'meta' => null,
                ];
            }

            return [
                'success' => true,
                'translation' => trim($translation),
                'error' => null,
                'meta' => $this->extractResponseMeta($response),
            ];
        } catch (Throwable $exception) {
            return [
                'success' => false,
                'translation' => null,
                'error' => $exception->getMessage(),
                'meta' => null,
            ];
        }
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    public function formatResponseMeta(array $meta): string
    {
        $lines = [];

        $fieldLabels = [
            'prompt_tokens' => 'Prompt tokens',
            'completion_tokens' => 'Completion tokens',
            'total_tokens' => 'Total tokens',
            'cost' => 'Cost',
            'model' => 'Model',
            'provider' => 'Provider',
            'request_id' => 'Request ID',
            'finish_reason' => 'Finish reason',
            'cached_tokens' => 'Cached tokens',
            'reasoning_tokens' => 'Reasoning tokens',
        ];

        foreach ($fieldLabels as $key => $label) {
            if (! array_key_exists($key, $meta) || $meta[$key] === null) {
                continue;
            }

            $value = $meta[$key];

            if ($key === 'cost' && is_float($value)) {
                $lines[] = sprintf('%s: $%s', $label, rtrim(rtrim(number_format($value, 8, '.', ''), '0'), '.'));

                continue;
            }

            $lines[] = sprintf('%s: %s', $label, $value);
        }

        return implode("\n", $lines);
    }

    /**
     * @return array<string, mixed>
     */
    private function extractResponseMeta(ResponseData $response): array
    {
        $meta = [
            'request_id' => $response->id,
            'model' => $response->model,
            'provider' => $response->provider,
            'finish_reason' => $this->extractFinishReason($response),
        ];

        $usage = $response->usage;

        if ($usage instanceof UsageData) {
            if ($usage->prompt_tokens !== null) {
                $meta['prompt_tokens'] = $usage->prompt_tokens;
            }

            if ($usage->completion_tokens !== null) {
                $meta['completion_tokens'] = $usage->completion_tokens;
            }

            if ($usage->total_tokens !== null) {
                $meta['total_tokens'] = $usage->total_tokens;
            }

            if ($usage->cost !== null) {
                $meta['cost'] = $usage->cost;
            }

            $cachedTokens = $usage->prompt_tokens_details?->cached_tokens;

            if ($cachedTokens !== null) {
                $meta['cached_tokens'] = $cachedTokens;
            }

            $reasoningTokens = $usage->completion_tokens_details?->reasoning_tokens;

            if ($reasoningTokens !== null) {
                $meta['reasoning_tokens'] = $reasoningTokens;
            }
        }

        return array_filter(
            $meta,
            fn (mixed $value): bool => $value !== null && $value !== '',
        );
    }

    private function extractFinishReason(ResponseData $response): ?string
    {
        $choices = $response->choices;

        if ($choices === null || $choices === []) {
            return null;
        }

        $firstChoice = $choices[0];

        if (is_array($firstChoice)) {
            $finishReason = $firstChoice['finish_reason'] ?? null;

            return is_string($finishReason) && $finishReason !== '' ? $finishReason : null;
        }

        if ($firstChoice instanceof ChoiceData) {
            return is_string($firstChoice->finish_reason) && $firstChoice->finish_reason !== ''
                ? $firstChoice->finish_reason
                : null;
        }

        return null;
    }

    private function extractTranslation(ResponseData $response): ?string
    {
        $choices = $response->choices;

        if ($choices === null || $choices === []) {
            return null;
        }

        $firstChoice = $choices[0];

        if (is_array($firstChoice)) {
            $message = $firstChoice['message'] ?? null;

            if (is_array($message)) {
                return $this->extractMessageContent($message);
            }

            return null;
        }

        if ($firstChoice instanceof NonStreamingChoiceData) {
            return $this->extractMessageContentFromDto($firstChoice->message);
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $message
     */
    private function extractMessageContent(array $message): ?string
    {
        $refusal = $message['refusal'] ?? null;

        if (is_string($refusal) && trim($refusal) !== '') {
            return null;
        }

        $content = $this->normalizeMessageContent($message['content'] ?? null);

        if ($content !== null && trim($content) !== '') {
            return $content;
        }

        return null;
    }

    private function extractMessageContentFromDto(MessageData $message): ?string
    {
        if (is_string($message->refusal) && trim($message->refusal) !== '') {
            return null;
        }

        $content = $this->normalizeMessageContent($message->content);

        if ($content !== null && trim($content) !== '') {
            return $content;
        }

        return null;
    }

    private function normalizeMessageContent(mixed $content): ?string
    {
        if (is_string($content)) {
            return $content;
        }

        if (! is_array($content)) {
            return null;
        }

        $parts = [];

        foreach ($content as $part) {
            if (is_string($part)) {
                $parts[] = $part;

                continue;
            }

            if ($part instanceof TextContentData) {
                $parts[] = $part->text;

                continue;
            }

            if (is_array($part)) {
                $text = $part['text'] ?? null;

                if (is_string($text) && $text !== '') {
                    $parts[] = $text;
                }
            }
        }

        if ($parts === []) {
            return null;
        }

        return implode("\n", $parts);
    }

    private function refreshOpenRouterClient(): void
    {
        app()->forgetInstance(ClientInterface::class);
    }
}
