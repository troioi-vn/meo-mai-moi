<?php

namespace App\Filament\Resources;

use App\Filament\Resources\EmailConfigurationResource\Pages;
use App\Models\EmailConfiguration;
use App\Services\EmailConfigurationService;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Notifications\Notification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class EmailConfigurationResource extends Resource
{
    protected static ?string $model = EmailConfiguration::class;

    protected static ?string $navigationIcon = 'heroicon-o-envelope-open';

    protected static ?string $navigationGroup = 'Communication';

    protected static ?int $navigationSort = 2;

    protected static ?string $recordTitleAttribute = 'provider';

    protected static ?string $navigationLabel = 'Email Configuration';

    protected static ?string $modelLabel = 'Email Configuration';

    protected static ?string $pluralModelLabel = 'Email Configurations';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Provider Configuration')
                    ->schema([
                        Forms\Components\Select::make('provider')
                            ->label('Email Provider')
                            ->options([
                                'smtp' => 'SMTP',
                                'mailgun' => 'Mailgun',
                            ])
                            ->required()
                            ->live()
                            ->afterStateUpdated(function (Forms\Set $set) {
                                // Clear config when provider changes
                                $set('config', []);
                            })
                            ->helperText('Choose your email service provider'),

                        Forms\Components\Toggle::make('is_active')
                            ->label('Active Configuration')
                            ->helperText('Only one configuration can be active at a time')
                            ->default(false),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('SMTP Configuration')
                    ->schema([
                        Forms\Components\TextInput::make('config.host')
                            ->label('SMTP Host')
                            ->required()
                            ->placeholder('smtp.gmail.com')
                            ->helperText('Your SMTP server hostname')
                            ->rules(['regex:/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|ip/'])
                            ->validationMessages([
                                'regex' => 'Please enter a valid hostname or IP address',
                            ]),

                        Forms\Components\TextInput::make('config.port')
                            ->label('SMTP Port')
                            ->required()
                            ->numeric()
                            ->default(587)
                            ->minValue(1)
                            ->maxValue(65535)
                            ->helperText('Common ports: 587 (TLS), 465 (SSL), 25 (unsecured)'),

                        Forms\Components\TextInput::make('config.username')
                            ->label('Username')
                            ->required()
                            ->placeholder('your-email@example.com')
                            ->helperText('Your SMTP username (usually your email address)'),

                        Forms\Components\TextInput::make('config.password')
                            ->label('Password')
                            ->required()
                            ->password()
                            ->revealable()
                            ->helperText('Your SMTP password or app-specific password'),

                        Forms\Components\Select::make('config.encryption')
                            ->label('Encryption')
                            ->options([
                                'tls' => 'TLS',
                                'ssl' => 'SSL',
                                null => 'None',
                            ])
                            ->default('tls')
                            ->helperText('Encryption method for secure connection'),

                        Forms\Components\TextInput::make('config.from_address')
                            ->label('From Email Address')
                            ->required()
                            ->email()
                            ->placeholder('noreply@yoursite.com')
                            ->helperText('Email address that will appear as sender'),

                        Forms\Components\TextInput::make('config.from_name')
                            ->label('From Name')
                            ->placeholder('Your App Name')
                            ->helperText('Name that will appear as sender (optional)'),
                    ])
                    ->columns(2)
                    ->visible(fn (Forms\Get $get): bool => $get('provider') === 'smtp'),

                Forms\Components\Section::make('Mailgun Configuration')
                    ->schema([
                        Forms\Components\TextInput::make('config.domain')
                            ->label('Mailgun Domain')
                            ->required()
                            ->placeholder('mg.yoursite.com')
                            ->helperText('Your Mailgun domain')
                            ->rules(['regex:/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/'])
                            ->validationMessages([
                                'regex' => 'Please enter a valid domain format',
                            ]),

                        Forms\Components\TextInput::make('config.api_key')
                            ->label('API Key')
                            ->required()
                            ->password()
                            ->revealable()
                            ->placeholder('key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
                            ->helperText('Your Mailgun API key')
                            ->rules(['regex:/^key-[a-zA-Z0-9]+$/'])
                            ->validationMessages([
                                'regex' => 'API key must be in format "key-" followed by alphanumeric characters',
                            ]),

                        Forms\Components\TextInput::make('config.endpoint')
                            ->label('API Endpoint')
                            ->default('api.mailgun.net')
                            ->placeholder('api.mailgun.net')
                            ->helperText('Mailgun API endpoint (use api.eu.mailgun.net for EU)'),

                        Forms\Components\TextInput::make('config.from_address')
                            ->label('From Email Address')
                            ->required()
                            ->email()
                            ->placeholder('noreply@yoursite.com')
                            ->helperText('Email address that will appear as sender'),

                        Forms\Components\TextInput::make('config.from_name')
                            ->label('From Name')
                            ->placeholder('Your App Name')
                            ->helperText('Name that will appear as sender (optional)'),
                    ])
                    ->columns(2)
                    ->visible(fn (Forms\Get $get): bool => $get('provider') === 'mailgun'),

                Forms\Components\Section::make('Test Configuration')
                    ->schema([
                        Forms\Components\Placeholder::make('test_info')
                            ->label('')
                            ->content('Use the "Test Connection" action to verify your email configuration before saving.'),
                    ])
                    ->visible(fn (string $operation): bool => $operation === 'edit'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('provider')
                    ->label('Provider')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'smtp' => 'info',
                        'mailgun' => 'success',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => strtoupper($state)),

                Tables\Columns\TextColumn::make('config.from_address')
                    ->label('From Address')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('Email address copied')
                    ->copyMessageDuration(1500),

                Tables\Columns\TextColumn::make('config.from_name')
                    ->label('From Name')
                    ->searchable()
                    ->placeholder('Not set'),

                Tables\Columns\IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean()
                    ->trueIcon('heroicon-o-check-circle')
                    ->falseIcon('heroicon-o-x-circle')
                    ->trueColor('success')
                    ->falseColor('gray'),

                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (EmailConfiguration $record): string => $record->isValid() ? 'success' : 'danger')
                    ->formatStateUsing(fn (EmailConfiguration $record): string => $record->isValid() ? 'Valid' : 'Invalid'),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Updated')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('provider')
                    ->options([
                        'smtp' => 'SMTP',
                        'mailgun' => 'Mailgun',
                    ]),

                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Active Status')
                    ->placeholder('All configurations')
                    ->trueLabel('Active only')
                    ->falseLabel('Inactive only'),

                Tables\Filters\Filter::make('valid_only')
                    ->label('Valid Configurations Only')
                    ->query(fn (Builder $query): Builder => 
                        $query->get()->filter(fn (EmailConfiguration $config) => $config->isValid())
                            ->pluck('id')->pipe(fn ($ids) => $query->whereIn('id', $ids))
                    ),
            ])
            ->actions([
                Tables\Actions\Action::make('test_connection')
                    ->label('Test Connection')
                    ->icon('heroicon-o-signal')
                    ->color('info')
                    ->action(function (EmailConfiguration $record): void {
                        $service = app(EmailConfigurationService::class);
                        
                        try {
                            $testResult = $service->testConfigurationWithDetails($record->provider, $record->config);
                            
                            if ($testResult['success']) {
                                Notification::make()
                                    ->title('Connection Test Successful')
                                    ->body('Email configuration is working correctly. A test email was sent to ' . ($record->config['from_address'] ?? 'the configured address') . '.')
                                    ->success()
                                    ->send();
                            } else {
                                $errorMessage = $testResult['error'] ?? 'Unknown error occurred';
                                $errorType = $testResult['error_type'] ?? 'unknown';
                                
                                $body = "Test failed: {$errorMessage}";
                                
                                // Add helpful hints based on error type
                                $hints = match($errorType) {
                                    'connection_failed' => 'Check your host, port, and network connectivity.',
                                    'authentication_failed' => 'Verify your username and password are correct.',
                                    'ssl_error' => 'Check your encryption settings and server certificates.',
                                    'mailgun_auth_failed' => 'Verify your Mailgun API key is correct and active.',
                                    'mailgun_domain_error' => 'Ensure your domain is properly configured in Mailgun.',
                                    'validation_failed' => 'Please review and correct the configuration fields.',
                                    default => 'Please review your configuration settings.'
                                };
                                
                                $body .= "\n\nSuggestion: {$hints}";
                                
                                Notification::make()
                                    ->title('Connection Test Failed')
                                    ->body($body)
                                    ->danger()
                                    ->send();
                            }
                        } catch (\App\Exceptions\EmailConfigurationException $e) {
                            $body = $e->getMessage();
                            if ($e->hasValidationErrors()) {
                                $body .= "\n\nValidation Errors:\n• " . implode("\n• ", $e->getValidationErrors());
                            }
                            
                            Notification::make()
                                ->title('Configuration Error')
                                ->body($body)
                                ->danger()
                                ->send();
                        } catch (\Exception $e) {
                            Notification::make()
                                ->title('Connection Test Error')
                                ->body('Unexpected error: ' . $e->getMessage())
                                ->danger()
                                ->send();
                        }
                    })
                    ->requiresConfirmation()
                    ->modalHeading('Test Email Configuration')
                    ->modalDescription('This will send a test email to verify the configuration. Continue?'),

                Tables\Actions\Action::make('activate')
                    ->label('Activate')
                    ->icon('heroicon-o-power')
                    ->color('success')
                    ->visible(fn (EmailConfiguration $record): bool => !$record->is_active && $record->isValid())
                    ->action(function (EmailConfiguration $record): void {
                        try {
                            // Validate configuration before activation
                            $validationErrors = $record->validateConfig();
                            if (!empty($validationErrors)) {
                                Notification::make()
                                    ->title('Activation Failed')
                                    ->body('Configuration has validation errors: ' . implode(', ', $validationErrors))
                                    ->danger()
                                    ->send();
                                return;
                            }

                            // Test configuration before activation
                            $service = app(EmailConfigurationService::class);
                            $testResult = $service->testConfigurationWithDetails($record->provider, $record->config);
                            
                            if (!$testResult['success']) {
                                Notification::make()
                                    ->title('Activation Failed')
                                    ->body('Configuration test failed: ' . ($testResult['error'] ?? 'Unknown error'))
                                    ->danger()
                                    ->send();
                                return;
                            }

                            $record->activate();
                            
                            // Update mail configuration
                            $service->updateMailConfig();
                            
                            Notification::make()
                                ->title('Configuration Activated')
                                ->body('Email configuration has been activated and tested successfully. Email notifications are now enabled.')
                                ->success()
                                ->send();

                        } catch (\App\Exceptions\EmailConfigurationException $e) {
                            $body = $e->getMessage();
                            if ($e->hasValidationErrors()) {
                                $body .= "\n\nValidation Errors:\n• " . implode("\n• ", $e->getValidationErrors());
                            }
                            
                            Notification::make()
                                ->title('Activation Failed')
                                ->body($body)
                                ->danger()
                                ->send();
                        } catch (\Exception $e) {
                            Notification::make()
                                ->title('Activation Failed')
                                ->body('Unexpected error: ' . $e->getMessage())
                                ->danger()
                                ->send();
                        }
                    })
                    ->requiresConfirmation()
                    ->modalHeading('Activate Email Configuration')
                    ->modalDescription('This will test the configuration, then deactivate any other active configuration and activate this one. Continue?'),

                Tables\Actions\Action::make('deactivate')
                    ->label('Deactivate')
                    ->icon('heroicon-o-power')
                    ->color('warning')
                    ->visible(fn (EmailConfiguration $record): bool => $record->is_active)
                    ->action(function (EmailConfiguration $record): void {
                        try {
                            $record->update(['is_active' => false]);
                            
                            Notification::make()
                                ->title('Configuration Deactivated')
                                ->body('Email configuration has been deactivated.')
                                ->success()
                                ->send();
                        } catch (\Exception $e) {
                            Notification::make()
                                ->title('Deactivation Failed')
                                ->body('Failed to deactivate configuration: ' . $e->getMessage())
                                ->danger()
                                ->send();
                        }
                    })
                    ->requiresConfirmation()
                    ->modalHeading('Deactivate Email Configuration')
                    ->modalDescription('This will disable email sending until another configuration is activated. Continue?'),

                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make()
                    ->visible(fn (EmailConfiguration $record): bool => !$record->is_active),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\BulkAction::make('test_configurations')
                        ->label('Test Selected')
                        ->icon('heroicon-o-signal')
                        ->color('info')
                        ->action(function (Collection $records): void {
                            $service = app(EmailConfigurationService::class);
                            $results = [];
                            
                            foreach ($records as $record) {
                                try {
                                    $success = $service->testConfiguration($record->provider, $record->config);
                                    $results[] = [
                                        'config' => $record->provider . ' (' . $record->config['from_address'] . ')',
                                        'status' => $success ? 'Success' : 'Failed'
                                    ];
                                } catch (\Exception $e) {
                                    $results[] = [
                                        'config' => $record->provider . ' (' . $record->config['from_address'] . ')',
                                        'status' => 'Error: ' . $e->getMessage()
                                    ];
                                }
                            }
                            
                            $message = "Test Results:\n" . collect($results)
                                ->map(fn ($result) => "• {$result['config']}: {$result['status']}")
                                ->join("\n");
                            
                            Notification::make()
                                ->title('Bulk Test Completed')
                                ->body($message)
                                ->info()
                                ->send();
                        })
                        ->requiresConfirmation()
                        ->modalHeading('Test Multiple Configurations')
                        ->modalDescription('This will test all selected email configurations. Continue?'),

                    Tables\Actions\DeleteBulkAction::make()
                        ->action(function (Collection $records): void {
                            // Prevent deletion of active configurations
                            $activeRecords = $records->filter(fn (EmailConfiguration $record) => $record->is_active);
                            
                            if ($activeRecords->isNotEmpty()) {
                                Notification::make()
                                    ->title('Cannot Delete Active Configurations')
                                    ->body('Please deactivate configurations before deleting them.')
                                    ->danger()
                                    ->send();
                                return;
                            }
                            
                            $records->each->delete();
                            
                            Notification::make()
                                ->title('Configurations Deleted')
                                ->body('Selected email configurations have been deleted.')
                                ->success()
                                ->send();
                        }),
                ]),
            ])
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('No Email Configurations')
            ->emptyStateDescription('Create your first email configuration to start sending notifications.')
            ->emptyStateIcon('heroicon-o-envelope-open');
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListEmailConfigurations::route('/'),
            'create' => Pages\CreateEmailConfiguration::route('/create'),
            'view' => Pages\ViewEmailConfiguration::route('/{record}'),
            'edit' => Pages\EditEmailConfiguration::route('/{record}/edit'),
        ];
    }

    public static function getNavigationBadge(): ?string
    {
        $activeCount = static::getModel()::where('is_active', true)->count();
        return $activeCount > 0 ? (string) $activeCount : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        $activeCount = static::getModel()::where('is_active', true)->count();
        
        if ($activeCount === 0) {
            return 'danger';
        }
        
        return 'success';
    }
}