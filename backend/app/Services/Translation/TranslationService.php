<?php

declare(strict_types=1);

namespace App\Services\Translation;

use GuzzleHttp\ClientInterface;
use MoeMizrak\LaravelOpenrouter\DTO\ChatData;
use MoeMizrak\LaravelOpenrouter\DTO\ErrorData;
use MoeMizrak\LaravelOpenrouter\DTO\MessageData;
use MoeMizrak\LaravelOpenrouter\DTO\NonStreamingChoiceData;
use MoeMizrak\LaravelOpenrouter\DTO\ResponseData;
use MoeMizrak\LaravelOpenrouter\DTO\TextContentData;
use MoeMizrak\LaravelOpenrouter\Facades\LaravelOpenRouter;
use Throwable;

class TranslationService
{
    public function __construct(
        private readonly TranslationSettingsService $settingsService,
    ) {}

    /**
     * @return array{success: bool, translation: ?string, error: ?string}
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
            ];
        }

        $apiKeyToUse = ($apiKey !== null && $apiKey !== '') ? $apiKey : $this->settingsService->getApiKey();

        if ($apiKeyToUse === null || $apiKeyToUse === '') {
            return [
                'success' => false,
                'translation' => null,
                'error' => 'OpenRouter API key is not configured.',
            ];
        }

        $modelToUse = ($model !== null && $model !== '') ? $model : $this->settingsService->getModel();

        if (! $this->settingsService->isAllowedModel($modelToUse)) {
            return [
                'success' => false,
                'translation' => null,
                'error' => 'Selected model is not allowed.',
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
                ];
            }

            $translation = $this->extractTranslation($response);

            if ($translation === null || trim($translation) === '') {
                return [
                    'success' => false,
                    'translation' => null,
                    'error' => 'OpenRouter returned an empty translation.',
                ];
            }

            return [
                'success' => true,
                'translation' => trim($translation),
                'error' => null,
            ];
        } catch (Throwable $exception) {
            return [
                'success' => false,
                'translation' => null,
                'error' => $exception->getMessage(),
            ];
        }
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
