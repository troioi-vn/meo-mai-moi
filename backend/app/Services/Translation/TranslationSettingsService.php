<?php

declare(strict_types=1);

namespace App\Services\Translation;

use App\Models\Settings;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;

class TranslationSettingsService
{
    public function getModel(): string
    {
        $model = Settings::get($this->settingKey('model'));

        if (is_string($model) && $model !== '' && $this->isAllowedModel($model)) {
            return $model;
        }

        return (string) config('translation.default_model');
    }

    public function getPromptTemplate(): string
    {
        $template = Settings::get($this->settingKey('prompt_template'));

        if (is_string($template) && $template !== '') {
            return $template;
        }

        return (string) config('translation.default_prompt_template');
    }

    public function getSourceLanguage(): string
    {
        $locale = Settings::get($this->settingKey('source_language'));

        if (is_string($locale) && $locale !== '' && $this->isAllowedSourceLanguage($locale)) {
            return $locale;
        }

        $default = config('translation.default_source_language', 'en');

        return is_string($default) && $this->isAllowedSourceLanguage($default) ? $default : 'en';
    }

    /**
     * @return array<string, string>
     */
    public function getAvailableSourceLanguages(): array
    {
        /** @var array<int, string> $supported */
        $supported = config('locales.supported', ['en']);
        /** @var array<string, string> $names */
        $names = config('locales.names', []);

        $options = [];

        foreach ($supported as $locale) {
            if (! is_string($locale) || $locale === '') {
                continue;
            }

            $options[$locale] = $names[$locale] ?? $locale;
        }

        return $options;
    }

    public function formatSourceLanguageLabel(string $locale): string
    {
        if (! $this->isAllowedSourceLanguage($locale)) {
            return $locale;
        }

        /** @var array<string, string> $names */
        $names = config('locales.names', []);

        return $names[$locale] ?? $locale;
    }

    public function isAllowedSourceLanguage(string $locale): bool
    {
        return array_key_exists($locale, $this->getAvailableSourceLanguages());
    }

    public function getApiKey(): ?string
    {
        $stored = Settings::get($this->settingKey('api_key'));

        if (is_string($stored) && $stored !== '') {
            try {
                return Crypt::decryptString($stored);
            } catch (DecryptException) {
                return null;
            }
        }

        $envKey = config('laravel-openrouter.api_key');

        return is_string($envKey) && $envKey !== '' ? $envKey : null;
    }

    public function hasApiKey(): bool
    {
        return $this->getApiKey() !== null;
    }

    public function getMaskedApiKey(): string
    {
        $apiKey = $this->getApiKey();

        if ($apiKey === null || $apiKey === '') {
            return '';
        }

        if (strlen($apiKey) <= 10) {
            return str_repeat('*', strlen($apiKey));
        }

        return substr($apiKey, 0, 6).'...'.substr($apiKey, -4);
    }

    /**
     * @return array<string, string>
     */
    public function getAvailableModels(): array
    {
        /** @var array<string, string> $models */
        $models = config('translation.models', []);

        return $models;
    }

    public function isAllowedModel(string $model): bool
    {
        return array_key_exists($model, $this->getAvailableModels());
    }

    public function buildPrompt(string $text, ?string $template = null, ?string $sourceLanguage = null): string
    {
        $template ??= $this->getPromptTemplate();
        $sourceLanguage ??= $this->getSourceLanguage();
        $sourceLanguageLabel = $this->formatSourceLanguageLabel($sourceLanguage);

        return str_replace(
            ['{text}', '{source_language}'],
            [$text, $sourceLanguageLabel],
            $template,
        );
    }

    public function applyRuntimeConfig(?string $apiKeyOverride = null): void
    {
        $apiKey = $apiKeyOverride ?? $this->getApiKey();

        if ($apiKey !== null && $apiKey !== '') {
            Config::set('laravel-openrouter.api_key', $apiKey);
        }
    }

    public function save(string $model, string $promptTemplate, string $sourceLanguage, ?string $apiKey = null): void
    {
        if ($apiKey !== null && $apiKey !== '') {
            Settings::set($this->settingKey('api_key'), Crypt::encryptString($apiKey));
        }

        Settings::set($this->settingKey('model'), $model);
        Settings::set($this->settingKey('prompt_template'), $promptTemplate);
        Settings::set($this->settingKey('source_language'), $sourceLanguage);
    }

    private function settingKey(string $name): string
    {
        /** @var array<string, string> $keys */
        $keys = config('translation.settings', []);

        return $keys[$name] ?? "translation.{$name}";
    }
}
