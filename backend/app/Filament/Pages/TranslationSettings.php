<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Services\Translation\TranslationService;
use App\Services\Translation\TranslationSettingsService;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class TranslationSettings extends Page
{
    /** @var array<string, mixed> */
    public array $data = [];

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-language';

    protected string $view = 'filament.pages.translation-settings';

    protected static string|\UnitEnum|null $navigationGroup = 'Configuration';

    protected static ?string $navigationLabel = 'Translation Settings';

    protected static ?string $title = 'Translation Settings';

    protected static ?int $navigationSort = 5;

    private TranslationSettingsService $translationSettingsService;

    private TranslationService $translationService;

    public function boot(): void
    {
        $this->translationSettingsService = app(TranslationSettingsService::class);
        $this->translationService = app(TranslationService::class);
    }

    public function mount(): void
    {
        if (! auth()->user()->hasRole('super_admin')) {
            abort(403, 'Access denied. Super Admin role required.');
        }

        $this->fillFormFromSettings(
            testText: (string) config('translation.default_test_text', ''),
        );

        $this->debugToBrowser('mount', [
            'hasStoredApiKey' => $this->translationSettingsService->hasApiKey(),
            'maskedApiKey' => $this->translationSettingsService->getMaskedApiKey(),
            'model' => $this->translationSettingsService->getModel(),
        ]);
    }

    public function form(Schema $form): Schema
    {
        return $form
            ->schema([
                Section::make('OpenRouter Connection')
                    ->description('Configure the OpenRouter API credentials and model used for AI translation.')
                    ->schema([
                        TextInput::make('api_key_display')
                            ->label('Current API Key')
                            ->disabled()
                            ->dehydrated(false)
                            ->visible(fn (): bool => $this->translationSettingsService->hasApiKey()),

                        TextInput::make('api_key')
                            ->label(fn (): string => $this->translationSettingsService->hasApiKey()
                                ? 'Replace API Key'
                                : 'OpenRouter API Key')
                            ->password()
                            ->revealable()
                            ->placeholder('Enter your OpenRouter API key')
                            ->helperText('Leave blank to keep the existing key. Obtain a key from the OpenRouter dashboard.'),

                        Select::make('model')
                            ->label('Translation Model')
                            ->options($this->translationSettingsService->getAvailableModels())
                            ->required()
                            ->helperText('Choose the model used for translation requests.'),
                    ])
                    ->columns(1),

                Section::make('Prompt Template')
                    ->description('Define how text is sent to the model. Use {text} for the content to translate and {source_language} for the selected source language name.')
                    ->schema([
                        Select::make('source_language')
                            ->label('Source Language')
                            ->options($this->translationSettingsService->getAvailableSourceLanguages())
                            ->required()
                            ->helperText('The human-readable name of this language is substituted for {source_language} in the prompt template.'),

                        Textarea::make('prompt_template')
                            ->label('Prompt Template')
                            ->rows(8)
                            ->required()
                            ->helperText('Use {text} and {source_language} placeholders as needed.'),
                    ])
                    ->columns(1),

                Section::make('Test Translation')
                    ->key('testTranslation')
                    ->description('Try a translation using the current form values without saving.')
                    ->schema([
                        Textarea::make('test_text')
                            ->label('Test Text')
                            ->rows(3)
                            ->placeholder('Enter sample text to translate…'),

                        Textarea::make('test_result')
                            ->label('Translation Result')
                            ->rows(4)
                            ->disabled()
                            ->dehydrated(false)
                            ->placeholder('Run a test to see the translation here.'),

                        Textarea::make('test_response_info')
                            ->label('OpenRouter Response Info')
                            ->rows(6)
                            ->disabled()
                            ->dehydrated(false)
                            ->placeholder('Run a test to see token usage and response details here.'),
                    ])
                    ->footerActions([
                        Action::make('runTest')
                            ->label('Run Test')
                            ->icon('heroicon-m-beaker')
                            ->action(function (): void {
                                $this->runTest();
                            }),
                    ])
                    ->columns(1),
            ])
            ->statePath('data');
    }

    public static function canAccess(): bool
    {
        return auth()->check() && auth()->user()->hasRole('super_admin');
    }

    public static function getNavigationBadge(): ?string
    {
        $service = app(TranslationSettingsService::class);

        return $service->hasApiKey() ? 'Configured' : 'Not configured';
    }

    public static function getNavigationBadgeColor(): ?string
    {
        $service = app(TranslationSettingsService::class);

        return $service->hasApiKey() ? 'success' : 'warning';
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('save')
                ->label('Save Settings')
                ->icon('heroicon-m-check')
                ->action(function (): void {
                    $this->saveSettings();
                }),

            Action::make('refresh')
                ->label('Refresh')
                ->icon('heroicon-m-arrow-path')
                ->action(function (): void {
                    $this->fillFormFromSettings(
                        testText: is_string($this->data['test_text'] ?? null) ? $this->data['test_text'] : '',
                        testResult: is_string($this->data['test_result'] ?? null) ? $this->data['test_result'] : '',
                        testResponseInfo: is_string($this->data['test_response_info'] ?? null) ? $this->data['test_response_info'] : '',
                    );

                    Notification::make()
                        ->title('Settings Refreshed')
                        ->success()
                        ->send();
                }),
        ];
    }

    private function fillFormFromSettings(string $testText = '', string $testResult = '', string $testResponseInfo = ''): void
    {
        $this->form->fill([
            'api_key' => '',
            'api_key_display' => $this->translationSettingsService->hasApiKey()
                ? $this->translationSettingsService->getMaskedApiKey()
                : '',
            'model' => $this->translationSettingsService->getModel(),
            'source_language' => $this->translationSettingsService->getSourceLanguage(),
            'prompt_template' => $this->translationSettingsService->getPromptTemplate(),
            'test_text' => $testText,
            'test_result' => $testResult,
            'test_response_info' => $testResponseInfo,
        ]);
    }

    private function saveSettings(): void
    {
        $state = $this->form->getState();

        $model = is_string($state['model'] ?? null) ? $state['model'] : '';
        $sourceLanguage = is_string($state['source_language'] ?? null) ? $state['source_language'] : '';
        $promptTemplate = is_string($state['prompt_template'] ?? null) ? $state['prompt_template'] : '';
        $apiKey = is_string($state['api_key'] ?? null) ? trim($state['api_key']) : '';

        $this->debugToBrowser('save:start', $this->debugFormSnapshot($state));

        if (! $this->translationSettingsService->isAllowedModel($model)) {
            $this->debugToBrowser('save:rejected', ['reason' => 'invalid_model', 'model' => $model]);

            Notification::make()
                ->title('Invalid model')
                ->body('Please select a model from the list.')
                ->danger()
                ->send();

            return;
        }

        if (! $this->translationSettingsService->isAllowedSourceLanguage($sourceLanguage)) {
            $this->debugToBrowser('save:rejected', ['reason' => 'invalid_source_language', 'sourceLanguage' => $sourceLanguage]);

            Notification::make()
                ->title('Invalid source language')
                ->body('Please select a source language from the list.')
                ->danger()
                ->send();

            return;
        }

        if (! str_contains($promptTemplate, '{text}')) {
            $this->debugToBrowser('save:rejected', ['reason' => 'missing_text_placeholder']);

            Notification::make()
                ->title('Invalid prompt template')
                ->body('The prompt template must contain the {text} placeholder.')
                ->danger()
                ->send();

            return;
        }

        if ($apiKey === '' && ! $this->translationSettingsService->hasApiKey()) {
            $this->debugToBrowser('save:rejected', ['reason' => 'api_key_required']);

            Notification::make()
                ->title('API key required')
                ->body('Please enter an OpenRouter API key.')
                ->danger()
                ->send();

            return;
        }

        $this->translationSettingsService->save(
            model: $model,
            promptTemplate: $promptTemplate,
            sourceLanguage: $sourceLanguage,
            apiKey: $apiKey !== '' ? $apiKey : null,
        );

        $this->fillFormFromSettings(
            testText: is_string($state['test_text'] ?? null) ? $state['test_text'] : '',
            testResult: is_string($state['test_result'] ?? null) ? $state['test_result'] : '',
            testResponseInfo: is_string($state['test_response_info'] ?? null) ? $state['test_response_info'] : '',
        );

        $this->debugToBrowser('save:success', [
            'hasStoredApiKey' => $this->translationSettingsService->hasApiKey(),
            'maskedApiKey' => $this->translationSettingsService->getMaskedApiKey(),
            'model' => $this->translationSettingsService->getModel(),
            'apiKeyUpdated' => $apiKey !== '',
        ]);

        Notification::make()
            ->title('Translation settings saved')
            ->success()
            ->send();
    }

    private function runTest(): void
    {
        $state = $this->form->getState();

        $testText = is_string($state['test_text'] ?? null) ? $state['test_text'] : '';
        $apiKey = is_string($state['api_key'] ?? null) ? trim($state['api_key']) : '';
        $model = is_string($state['model'] ?? null) ? $state['model'] : null;
        $sourceLanguage = is_string($state['source_language'] ?? null) ? $state['source_language'] : null;
        $promptTemplate = is_string($state['prompt_template'] ?? null) ? $state['prompt_template'] : null;

        $this->debugToBrowser('test:start', [
            ...$this->debugFormSnapshot($state),
            'testTextLength' => strlen($testText),
            'usingStoredApiKey' => $apiKey === '' && $this->translationSettingsService->hasApiKey(),
        ]);

        $result = $this->translationService->test(
            text: $testText,
            apiKey: $apiKey !== '' ? $apiKey : null,
            model: $model,
            promptTemplate: $promptTemplate,
            sourceLanguage: $sourceLanguage,
        );

        if ($result['success']) {
            $this->data['test_result'] = $result['translation'];
            $meta = is_array($result['meta'] ?? null) ? $result['meta'] : [];
            $this->data['test_response_info'] = $meta !== []
                ? $this->translationService->formatResponseMeta($meta)
                : '';

            $this->debugToBrowser('test:success', [
                'translationLength' => strlen((string) $result['translation']),
                'translationPreview' => mb_substr((string) $result['translation'], 0, 120),
                'meta' => $meta,
            ]);

            Notification::make()
                ->title('Translation test succeeded')
                ->success()
                ->send();

            return;
        }

        $this->data['test_result'] = '';
        $this->data['test_response_info'] = '';

        $this->debugToBrowser('test:failed', [
            'error' => $result['error'] ?? 'Unknown error',
        ]);

        Notification::make()
            ->title('Translation test failed')
            ->body($result['error'] ?? 'Unknown error')
            ->danger()
            ->send();
    }

    /**
     * Temporary browser-console debug helper. Remove after translation settings are verified.
     *
     * @param  array<string, mixed>  $payload
     */
    private function debugToBrowser(string $step, array $payload = []): void
    {
        $this->dispatch(
            'translation-settings-debug',
            step: $step,
            payload: $payload,
            at: now()->toIso8601String(),
        );
    }

    /**
     * @param  array<string, mixed>  $state
     * @return array<string, mixed>
     */
    private function debugFormSnapshot(array $state): array
    {
        $apiKey = is_string($state['api_key'] ?? null) ? trim($state['api_key']) : '';

        return [
            'model' => $state['model'] ?? null,
            'sourceLanguage' => $state['source_language'] ?? null,
            'apiKeyDisplay' => $state['api_key_display'] ?? null,
            'apiKeyProvided' => $apiKey !== '',
            'apiKeyLength' => strlen($apiKey),
            'hasStoredApiKey' => $this->translationSettingsService->hasApiKey(),
            'promptTemplateLength' => strlen(is_string($state['prompt_template'] ?? null) ? $state['prompt_template'] : ''),
            'testTextLength' => strlen(is_string($state['test_text'] ?? null) ? $state['test_text'] : ''),
            'testResultLength' => strlen(is_string($state['test_result'] ?? null) ? $state['test_result'] : ''),
            'testResponseInfoLength' => strlen(is_string($state['test_response_info'] ?? null) ? $state['test_response_info'] : ''),
        ];
    }
}
