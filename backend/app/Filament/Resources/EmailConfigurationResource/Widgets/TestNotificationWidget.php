<?php

declare(strict_types=1);

namespace App\Filament\Resources\EmailConfigurationResource\Widgets;

use App\Models\Notification;
use App\Services\NotificationService;
use Filament\Forms;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Notifications\Notification as FilamentNotification;
use Filament\Widgets\Widget;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TestNotificationWidget extends Widget implements HasForms
{
    use InteractsWithForms;

    protected static string $view = 'filament.resources.email-configuration-resource.widgets.test-notification-widget';

    protected int|string|array $columnSpan = 'full';

    public array $data = [];

    public function mount(): void
    {
        $this->form->fill([
            'email' => null,
            'types' => [],
            'locale' => config('notification_templates.default_locale', 'en'),
        ]);
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Test Notification')
                    ->description('Send selected notification types as test emails and/or in-app notifications.')
                    ->schema([
                        Forms\Components\TextInput::make('email')
                            ->label('Test email address')
                            ->email()
                            ->required()
                            ->maxLength(255),

                        Forms\Components\Select::make('locale')
                            ->label('Locale')
                            ->options($this->getLocaleOptions())
                            ->searchable()
                            ->default(config('notification_templates.default_locale', 'en'))
                            ->helperText('Defaults to English if not selected.'),

                        Forms\Components\CheckboxList::make('types')
                            ->label('Notification types')
                            ->options(fn (): array => $this->getNotificationTypeOptions())
                            ->searchable()
                            ->columns(2)
                            ->required(),

                        Forms\Components\Actions::make([
                            Forms\Components\Actions\Action::make('send')
                                ->label('Send Test Notifications')
                                ->icon('heroicon-o-paper-airplane')
                                ->color('primary')
                                ->action(function (): void {
                                    $this->sendTestNotifications();
                                }),
                        ])->columnSpanFull(),
                    ])
                    ->columns(2),
            ])
            ->statePath('data');
    }

    public function sendTestNotifications(): void
    {
        $supportedLocales = config('locales.supported', ['en']);
        if (! is_array($supportedLocales) || $supportedLocales === []) {
            $supportedLocales = ['en'];
        }

        $this->validate([
            'data.email' => ['required', 'email', 'max:255'],
            'data.types' => ['required', 'array', 'min:1'],
            'data.types.*' => ['string'],
            'data.locale' => ['nullable', 'string', 'max:5', Rule::in($supportedLocales)],
        ]);

        $admin = auth()->user();
        if (! $admin) {
            abort(403);
        }

        $email = (string) ($this->data['email'] ?? '');
        $locale = $this->data['locale'] ?? null;
        if (! is_string($locale) || trim($locale) === '') {
            $locale = 'en';
        }

        $types = array_values(array_unique(Arr::wrap($this->data['types'] ?? [])));

        $service = app(NotificationService::class);

        $emailQueued = 0;
        $inAppCreated = 0;
        $emailFailed = 0;

        foreach ($types as $type) {
            if (! is_string($type) || trim($type) === '') {
                continue;
            }

            $channels = $this->resolveChannelsForType($type);
            $payload = $this->buildTestData($type, $locale);

            if (in_array('email', $channels, true)) {
                $ok = $service->sendEmail($admin, $type, array_merge($payload, [
                    'recipient_email' => $email,
                    'locale' => $locale,
                ]));

                if ($ok) {
                    $emailQueued++;
                } else {
                    $emailFailed++;
                }
            }

            if (in_array('in_app', $channels, true)) {
                $ok = $service->sendInApp($admin, $type, array_merge($payload, [
                    'locale' => $locale,
                ]));

                if ($ok) {
                    $inAppCreated++;
                }
            }
        }

        $body = "Email queued: {$emailQueued}. In-app created: {$inAppCreated}.";
        if ($emailFailed > 0) {
            $body .= " Email failed: {$emailFailed}.";
        }

        FilamentNotification::make()
            ->title('Test notifications dispatched')
            ->body($body)
            ->success()
            ->send();
    }

    private function getLocaleOptions(): array
    {
        $supported = config('locales.supported', ['en']);
        $names = config('locales.names', []);

        $options = [];

        if (! is_array($supported)) {
            $supported = ['en'];
        }

        foreach ($supported as $locale) {
            if (! is_string($locale) || $locale === '') {
                continue;
            }

            $options[$locale] = is_array($names) && isset($names[$locale])
                ? (string) $names[$locale]
                : strtoupper($locale);
        }

        return $options;
    }

    private function getNotificationTypeOptions(): array
    {
        $types = [];

        foreach (array_keys((array) config('notification_templates.types', [])) as $type) {
            if (is_string($type) && $type !== '') {
                $types[$type] = true;
            }
        }

        foreach ($this->getKnownAdHocTypes() as $type) {
            $types[$type] = true;
        }

        try {
            $dbTypes = Notification::query()
                ->whereNotNull('type')
                ->where('type', '!=', '')
                ->distinct()
                ->pluck('type')
                ->all();

            foreach ($dbTypes as $type) {
                if (is_string($type) && $type !== '') {
                    $types[$type] = true;
                }
            }
        } catch (\Throwable) {
            // Database may not be available during early setup; still show config + known ad-hoc types.
        }

        $labels = [];
        foreach (array_keys($types) as $type) {
            $labels[$type] = $this->labelForType($type);
        }

        asort($labels, SORT_NATURAL | SORT_FLAG_CASE);

        return $labels;
    }

    private function labelForType(string $type): string
    {
        $notification = new Notification(['type' => $type]);
        $label = (string) $notification->type_display;

        return $label !== '' ? $label : Str::headline($type);
    }

    private function resolveChannelsForType(string $type): array
    {
        $cfg = config("notification_templates.types.{$type}");

        if (is_array($cfg) && isset($cfg['channels']) && is_array($cfg['channels'])) {
            return array_values(array_unique(array_filter($cfg['channels'], fn ($c) => is_string($c) && $c !== '')));
        }

        // Unknown/ad-hoc types are treated as in-app only.
        return ['in_app'];
    }

    private function getKnownAdHocTypes(): array
    {
        // These exist in code but are not part of the NotificationType enum/notification_templates registry.
        return [
            'city_created',
            'deployment',
            'system_announcement',
            // Common legacy/test types referenced in console tooling
            'placement_request',
            'transfer_request',
            'transfer_accepted',
            'transfer_rejected',
            'handover_scheduled',
            'handover_completed',
            'review_received',
            'profile_approved',
            'profile_rejected',
        ];
    }

    private function buildTestData(string $type, string $locale): array
    {
        $label = $this->labelForType($type);

        return [
            // In-app rendering uses message when present; keeping it non-empty avoids template-variable requirements.
            'message' => "Test notification: {$label}",
            'title' => "Test: {$label}",
            'body' => "This is a test notification for type \"{$type}\" (locale: {$locale}).",
            'link' => '/admin',
        ];
    }
}
