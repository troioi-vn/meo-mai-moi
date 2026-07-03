<?php

declare(strict_types=1);

namespace App\Services\Translation;

use MoeMizrak\LaravelOpenrouter\DTO\ChatData;
use MoeMizrak\LaravelOpenrouter\DTO\ErrorData;
use MoeMizrak\LaravelOpenrouter\DTO\MessageData;
use MoeMizrak\LaravelOpenrouter\DTO\NonStreamingChoiceData;
use MoeMizrak\LaravelOpenrouter\DTO\ResponseData;
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

            $prompt = $this->settingsService->buildPrompt($text, $templateToUse);

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

        if (! $firstChoice instanceof NonStreamingChoiceData) {
            return null;
        }

        $content = $firstChoice->message->content;

        if (is_string($content)) {
            return $content;
        }

        return null;
    }
}
