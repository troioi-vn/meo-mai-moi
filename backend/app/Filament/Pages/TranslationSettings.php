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

        $this->form->fill([
            'api_key' => '',
            'model' => $this->translationSettingsService->getModel(),
            'prompt_template' => $this->translationSettingsService->getPromptTemplate(),
            'test_text' => '',
            'test_result' => '',
        ]);
    }

    public function form(Schema $form): Schema
    {
        return $form
            ->schema([
                Section::make('OpenRouter Connection')
                    ->description('Configure the OpenRouter API credentials and model used for AI translation.')
                    ->schema([
                        TextInput::make('api_key')
                            ->label('OpenRouter API Key')
                            ->password()
                            ->revealable()
                            ->placeholder(fn (): string => $this->translationSettingsService->hasApiKey()
                                ? $this->translationSettingsService->getMaskedApiKey()
                                : 'Enter your OpenRouter API key')
                            ->helperText('Leave blank to keep the existing key. Obtain a key from the OpenRouter dashboard.'),

                        Select::make('model')
                            ->label('Translation Model')
                            ->options($this->translationSettingsService->getAvailableModels())
                            ->required()
                            ->helperText('Choose the model used for translation requests.'),
                    ])
                    ->columns(1),

                Section::make('Prompt Template')
                    ->description('Define how text is sent to the model. Use {text} as the placeholder for the content to translate.')
                    ->schema([
                        Textarea::make('prompt_template')
                            ->label('Prompt Template')
                            ->rows(8)
                            ->required()
                            ->helperText('Translation direction and target language are set here, e.g. "Translate the following text to Vietnamese…"'),
                    ])
                    ->columns(1),

                Section::make('Test Translation')
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

            Action::make('runTest')
                ->label('Run Test')
                ->icon('heroicon-m-beaker')
                ->action(function (): void {
                    $this->runTest();
                }),

            Action::make('refresh')
                ->label('Refresh')
                ->icon('heroicon-m-arrow-path')
                ->action(function (): void {
                    $this->form->fill([
                        'api_key' => '',
                        'model' => $this->translationSettingsService->getModel(),
                        'prompt_template' => $this->translationSettingsService->getPromptTemplate(),
                        'test_text' => $this->data['test_text'] ?? '',
                        'test_result' => $this->data['test_result'] ?? '',
                    ]);

                    Notification::make()
                        ->title('Settings Refreshed')
                        ->success()
                        ->send();
                }),
        ];
    }

    private function saveSettings(): void
    {
        $model = is_string($this->data['model'] ?? null) ? $this->data['model'] : '';
        $promptTemplate = is_string($this->data['prompt_template'] ?? null) ? $this->data['prompt_template'] : '';
        $apiKey = is_string($this->data['api_key'] ?? null) ? trim($this->data['api_key']) : '';

        if (! $this->translationSettingsService->isAllowedModel($model)) {
            Notification::make()
                ->title('Invalid model')
                ->body('Please select a model from the list.')
                ->danger()
                ->send();

            return;
        }

        if (! str_contains($promptTemplate, '{text}')) {
            Notification::make()
                ->title('Invalid prompt template')
                ->body('The prompt template must contain the {text} placeholder.')
                ->danger()
                ->send();

            return;
        }

        if ($apiKey === '' && ! $this->translationSettingsService->hasApiKey()) {
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
            apiKey: $apiKey !== '' ? $apiKey : null,
        );

        $this->data['api_key'] = '';

        Notification::make()
            ->title('Translation settings saved')
            ->success()
            ->send();
    }

    private function runTest(): void
    {
        $testText = is_string($this->data['test_text'] ?? null) ? $this->data['test_text'] : '';
        $apiKey = is_string($this->data['api_key'] ?? null) ? trim($this->data['api_key']) : '';
        $model = is_string($this->data['model'] ?? null) ? $this->data['model'] : null;
        $promptTemplate = is_string($this->data['prompt_template'] ?? null) ? $this->data['prompt_template'] : null;

        $result = $this->translationService->test(
            text: $testText,
            apiKey: $apiKey !== '' ? $apiKey : null,
            model: $model,
            promptTemplate: $promptTemplate,
        );

        if ($result['success']) {
            $this->data['test_result'] = $result['translation'];

            Notification::make()
                ->title('Translation test succeeded')
                ->success()
                ->send();

            return;
        }

        $this->data['test_result'] = '';

        Notification::make()
            ->title('Translation test failed')
            ->body($result['error'] ?? 'Unknown error')
            ->danger()
            ->send();
    }
}
