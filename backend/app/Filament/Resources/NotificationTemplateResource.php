<?php

namespace App\Filament\Resources;

use App\Filament\Resources\NotificationTemplateResource\Pages;
use App\Models\NotificationTemplate;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Forms\Get;
use Filament\Forms\Set;
use Filament\Notifications\Notification as FilamentNotification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\HtmlString;

class NotificationTemplateResource extends Resource
{
    protected static ?string $model = NotificationTemplate::class;

    protected static ?string $navigationIcon = 'heroicon-o-bell-alert';

    protected static ?string $navigationGroup = 'Notifications';

    protected static ?string $navigationLabel = 'Templates';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('type')
                    ->label('Type (event trigger)')
                    ->helperText('Select the event trigger (NotificationType) this template applies to.')
                    ->options(function (Get $get) {
                        $types = config('notification_templates.types', []);
                        $channel = (string) $get('channel');
                        $opts = collect($types)
                            ->mapWithKeys(function ($cfg, $key) use ($channel) {
                                $slug = $cfg['slug'] ?? $key;
                                // If a channel is selected, only include types that support it
                                if ($channel && isset($cfg['channels']) && is_array($cfg['channels']) && ! in_array($channel, $cfg['channels'], true)) {
                                    return [];
                                }
                                $label = \Illuminate\Support\Str::headline($slug)." ({$key})";

                                return [$key => $label];
                            })
                            ->toArray();

                        return $opts;
                    })
                    ->preload()
                    ->searchable()
                    ->required()
                    ->columnSpan(2)
                    ->reactive()
                    ->afterStateUpdated(function (Set $set, Get $get) {
                        self::prefillFromDefaults($set, $get);
                    }),
                Forms\Components\Select::make('channel')
                    ->options([
                        'email' => 'Email',
                        'in_app' => 'In-App',
                    ])
                    ->required()
                    ->reactive()
                    ->afterStateUpdated(function (Set $set, Get $get) {
                        self::prefillFromDefaults($set, $get);
                    }),
                Forms\Components\TextInput::make('locale')
                    ->default(config('notification_templates.default_locale', 'en'))
                    ->required()
                    ->reactive()
                    ->afterStateUpdated(function (Set $set, Get $get) {
                        self::prefillFromDefaults($set, $get);
                    }),
                Forms\Components\Select::make('engine')->options([
                    'blade' => 'Blade',
                    'markdown' => 'Markdown',
                    'text' => 'Text',
                ])->required(),
                Forms\Components\Select::make('status')->options([
                    'active' => 'Active',
                    'inactive' => 'Inactive',
                ])->default('active')->required(),
                Forms\Components\Textarea::make('subject_template')->rows(2)->columnSpanFull()->hint('Email only'),
                Forms\Components\Textarea::make('body_template')->rows(16)->columnSpanFull()->required(),
                Forms\Components\Section::make('Available variables')
                    ->collapsible()
                    ->collapsed()
                    ->schema([
                        Forms\Components\Placeholder::make('variables_help')
                            ->content(function (Get $get) {
                                $type = (string) $get('type');
                                $registry = config('notification_templates.types');
                                $vars = $registry[$type]['variables'] ?? [];
                                if (empty($vars)) {
                                    return 'No documented variables for this type yet.';
                                }
                                $lines = array_map(function ($v) {
                                    $req = ! empty($v['required']) ? ' (required)' : '';
                                    $type = $v['type'] ?? 'mixed';

                                    return "- {{$v['name']}}: {$type}{$req}";
                                }, $vars);

                                return new HtmlString(nl2br(e(implode("\n", $lines))));
                            }),
                    ])->columnSpanFull(),
                Forms\Components\Actions::make([
                    Forms\Components\Actions\Action::make('browse_triggers')
                        ->label('Browse available triggers')
                        ->modalHeading('Available notification triggers')
                        ->modalSubmitAction(false)
                        ->modalCancelActionLabel('Close')
                        ->modalContent(function () {
                            $types = config('notification_templates.types', []);
                            if (empty($types)) {
                                return new HtmlString('<em>No triggers registered.</em>');
                            }
                            $rows = '';
                            foreach ($types as $key => $cfg) {
                                $slug = $cfg['slug'] ?? $key;
                                $label = \Illuminate\Support\Str::headline($slug);
                                $channels = implode(', ', $cfg['channels'] ?? []);
                                $rows .= '<tr>'
                                    .'<td style="padding:6px 8px; border-bottom:1px solid #eee"><code>'.e($key).'</code></td>'
                                    .'<td style="padding:6px 8px; border-bottom:1px solid #eee">'.e($label).'</td>'
                                    .'<td style="padding:6px 8px; border-bottom:1px solid #eee">'.e($channels).'</td>'
                                    .'</tr>';
                            }
                            $html = '<div style="max-height:70vh; overflow:auto">'
                                .'<table style="width:100%; border-collapse:collapse">'
                                .'<thead><tr>'
                                .'<th style="text-align:left; padding:6px 8px; border-bottom:1px solid #ddd">Type (key)</th>'
                                .'<th style="text-align:left; padding:6px 8px; border-bottom:1px solid #ddd">Slug/Name</th>'
                                .'<th style="text-align:left; padding:6px 8px; border-bottom:1px solid #ddd">Channels</th>'
                                .'</tr></thead><tbody>'
                                .$rows
                                .'</tbody></table></div>';

                            return new HtmlString($html);
                        }),
                    Forms\Components\Actions\Action::make('preview')
                        ->label('Preview')
                        ->modalHeading('Template Preview')
                        ->modalSubmitAction(false)
                        ->modalCancelActionLabel('Close')
                        ->modalContent(function (Get $get) {
                            $channel = (string) $get('channel');
                            $locale = (string) $get('locale');
                            $subject = $get('subject_template');
                            $body = (string) $get('body_template');
                            $engine = (string) $get('engine');

                            $template = [
                                'source' => 'db',
                                'subject' => $subject,
                                'body' => $body,
                                'engine' => $engine,
                                'locale' => $locale,
                                'version' => 0,
                            ];

                            $renderer = app(\App\Services\Notifications\NotificationTemplateRenderer::class);
                            $data = ['user' => auth()->user(), 'actionUrl' => config('app.url')];
                            $rendered = $renderer->render($template, $data, $channel);

                            if ($channel === 'email') {
                                $html = $rendered['html'] ?? '<em>(no html)</em>';

                                return new HtmlString('<div style="max-height:70vh; overflow:auto; border:1px solid #e5e7eb; padding:12px; background:#fff">'.$html.'</div>');
                            }

                            $msg = e($rendered['message'] ?? '(no message)');

                            return new HtmlString('<div style="white-space:pre-wrap; max-height:70vh; overflow:auto; border:1px solid #e5e7eb; padding:12px; background:#fafafa">'.$msg.'</div>');
                        }),
                ])->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('type')->searchable()->sortable(),
                Tables\Columns\BadgeColumn::make('channel')->colors([
                    'primary' => 'email',
                    'success' => 'in_app',
                ])->sortable(),
                Tables\Columns\TextColumn::make('locale')->sortable(),
                Tables\Columns\TextColumn::make('engine')->sortable(),
                Tables\Columns\TextColumn::make('status')->sortable(),
                Tables\Columns\TextColumn::make('version')->sortable(),
                Tables\Columns\TextColumn::make('updated_at')->dateTime()->since(),
            ])
            ->filters([
                SelectFilter::make('channel')
                    ->options([
                        'email' => 'Email',
                        'in_app' => 'In-App',
                    ]),
                SelectFilter::make('locale')
                    ->label('Locale')
                    ->options(fn () => collect(range('a', 'z'))->take(0) && [] /* placeholder to satisfy callable */)
                    ->options(function () {
                        // Collect distinct locales from DB
                        return NotificationTemplate::query()->select('locale')->distinct()->pluck('locale', 'locale')->toArray();
                    }),
                SelectFilter::make('type')
                    ->label('Type')
                    ->options(function () {
                        $types = config('notification_templates.types');

                        // show slug for readability
                        return collect($types)->mapWithKeys(fn ($cfg, $key) => [$key => $cfg['slug'] ?? $key])->toArray();
                    }),
            ])
            ->emptyStateHeading('No template overrides yet')
            ->emptyStateDescription('File-based defaults are currently being used for all notifications. Create an override to customize a specific type/channel/locale.')
            ->emptyStateActions([
                Tables\Actions\CreateAction::make()->label('Create override'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('compare')
                    ->label('Compare with Default')
                    // Use a safe icon; if not present, omit the icon to avoid SvgNotFound.
                    ->icon('heroicon-o-arrows-right-left')
                    ->modalHeading('Compare with Default')
                    ->modalSubmitAction(false)
                    ->modalCancelActionLabel('Close')
                    ->action(function () {})
                    ->modalContent(function (NotificationTemplate $record) {
                        $type = $record->type;
                        $locale = $record->locale;
                        $channel = $record->channel;
                        $registry = config('notification_templates.types');
                        $slug = $registry[$type]['slug'] ?? null;

                        $dbSubject = (string) ($record->subject_template ?? '');
                        $dbBody = (string) $record->body_template;

                        $defaultLabel = '';
                        $fileSubject = '';
                        $fileBody = '';

                        if ($channel === 'in_app' && $slug) {
                            $path = resource_path("templates/notifications/bell/{$locale}/{$slug}.md");
                            if (is_file($path)) {
                                $fileBody = file_get_contents($path) ?: '';
                                $defaultLabel = "File: {$path}";
                            } else {
                                $defaultLabel = 'No file default found.';
                            }
                        } elseif ($channel === 'email' && $slug) {
                            $view = "emails.notifications.{$locale}.{$slug}";
                            $legacy = "emails.notifications.{$slug}";
                            if (view()->exists($view)) {
                                $fileBody = "@include('{$view}')";
                                $defaultLabel = "View: {$view}";
                            } elseif (view()->exists($legacy)) {
                                $fileBody = "@include('{$legacy}')";
                                $defaultLabel = "View: {$legacy} (legacy)";
                            } else {
                                $defaultLabel = 'No view default found.';
                            }
                        }

                        $tpl = fn ($title, $content) => '<div style="width:48%; display:inline-block; vertical-align:top;">'
                            .'<div style="font-weight:600; margin-bottom:6px">'.e($title).'</div>'
                            .'<pre style="white-space:pre-wrap; border:1px solid #e5e7eb; padding:10px; background:#f8fafc; max-height:60vh; overflow:auto">'.e($content).'</pre>'
                            .'</div>';

                        $html = '<div style="display:flex; gap:4%; align-items:flex-start">'
                            .$tpl('DB Subject', $dbSubject)
                            .$tpl('Default Subject', $fileSubject)
                            .'</div>'
                            .'<div style="height:8px"></div>'
                            .'<div style="display:flex; gap:4%; align-items:flex-start">'
                            .$tpl('DB Body', $dbBody)
                            .$tpl('Default ('.$defaultLabel.')', $fileBody)
                            .'</div>';

                        return new HtmlString($html);
                    }),
                Tables\Actions\Action::make('reset')
                    ->label('Reset to Default')
                    ->requiresConfirmation()
                    ->visible(fn ($record) => $record->status === 'active')
                    ->action(function (NotificationTemplate $record) {
                        $record->delete();
                        FilamentNotification::make()->title('Template reset')->body('DB override removed. File/default will be used.')->success()->send();
                    }),
                Tables\Actions\Action::make('send_test')
                    ->label('Send Test Email')
                    ->icon('heroicon-o-paper-airplane')
                    ->visible(fn (NotificationTemplate $record) => $record->channel === 'email')
                    ->requiresConfirmation()
                    ->action(function (NotificationTemplate $record) {
                        $renderer = app(\App\Services\Notifications\NotificationTemplateRenderer::class);
                        $template = [
                            'source' => 'db',
                            'subject' => $record->subject_template,
                            'body' => $record->body_template,
                            'engine' => $record->engine,
                            'locale' => $record->locale,
                            'version' => $record->version,
                        ];
                        $user = auth()->user();
                        $data = ['user' => $user, 'actionUrl' => config('app.url'), 'unsubscribeUrl' => config('app.url').'/unsubscribe'];
                        $rendered = $renderer->render($template, $data, 'email');
                        $subject = $rendered['subject'] ?: ('[Test] '.$record->type.' ('.$record->locale.')');
                        $html = $rendered['html'] ?? '<p>(no content)</p>';

                        // Send using a lightweight anonymous mailable
                        Mail::to($user->email)->send(new class($subject, $html) extends Mailable
                        {
                            public function __construct(private string $s, private string $h) {}

                            public function build(): self
                            {
                                return $this->subject($this->s)->html($this->h);
                            }
                        });

                        FilamentNotification::make()->title('Test email sent')->body('Sent to your email address.')->success()->send();
                    }),
            ])
            ->bulkActions([
                Tables\Actions\DeleteBulkAction::make(),
            ]);
    }

    /**
     * Prefill engine/body from file defaults when creating or editing and fields are empty.
     */
    protected static function prefillFromDefaults(Set $set, Get $get): void
    {
        $type = (string) $get('type');
        $channel = (string) $get('channel');
        $locale = (string) $get('locale');

        if (! $type || ! $channel || ! $locale) {
            return;
        }

        // Only prefill if body is empty to avoid clobbering edits
        $currentBody = (string) ($get('body_template') ?? '');
        if ($currentBody !== '') {
            return;
        }

        $types = config('notification_templates.types');
        $slug = $types[$type]['slug'] ?? null;
        if (! $slug) {
            return;
        }

        if ($channel === 'in_app') {
            $path = resource_path("templates/notifications/bell/{$locale}/{$slug}.md");
            if (is_file($path)) {
                $set('engine', 'markdown');
                $set('body_template', file_get_contents($path) ?: '');

                return;
            }
        }

        if ($channel === 'email') {
            $view = "emails.notifications.{$locale}.{$slug}";
            $legacy = "emails.notifications.{$slug}";
            if (view()->exists($view)) {
                $set('engine', 'blade');
                $set('body_template', "@include('{$view}')");

                return;
            }
            if (view()->exists($legacy)) {
                $set('engine', 'blade');
                $set('body_template', "@include('{$legacy}')");

                return;
            }
        }

        // Fallback: set engine default by channel if nothing found
        $defaultEngine = config("notification_templates.channels.{$channel}.engine", 'blade');
        $set('engine', $defaultEngine);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListNotificationTemplates::route('/'),
            'create' => Pages\CreateNotificationTemplate::route('/create'),
            'edit' => Pages\EditNotificationTemplate::route('/{record}/edit'),
        ];
    }
}
