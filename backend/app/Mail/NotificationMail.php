<?php

namespace App\Mail;

use App\Enums\NotificationType;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Services\UnsubscribeService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

abstract class NotificationMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    protected User $user;

    protected NotificationType $notificationType;

    protected array $data;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, NotificationType $notificationType, array $data = [])
    {
        $this->user = $user;
        $this->notificationType = $notificationType;
        $this->data = $data;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = $this->subject ?: $this->getSubject();

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        // Try DB/file override via resolver first
        $resolver = app(\App\Services\Notifications\NotificationTemplateResolver::class);
        $renderer = app(\App\Services\Notifications\NotificationTemplateRenderer::class);
        $localeResolver = app(\App\Services\Notifications\NotificationLocaleResolver::class);

        $locale = $localeResolver->resolve($this->user, request());
        $resolved = $resolver->resolve($this->notificationType->value, 'email', $locale);

        if ($resolved) {
            // If resolved from file and we have a concrete view name, prefer returning the view
            if (($resolved['source'] ?? null) === 'file' && isset($resolved['view']) && $resolved['view'] !== '') {
                return new Content(
                    view: $resolved['view'],
                    with: $this->getTemplateData(),
                );
            }

            // Otherwise, render inline HTML (DB overrides)
            $rendered = $renderer->render($resolved, $this->getTemplateData(), 'email');
            if (isset($rendered['subject']) && $rendered['subject'] !== '') {
                $this->subject($rendered['subject']);
            }

            return new Content(
                html: $rendered['html'] ?? ''
            );
        }

        // Fallback to legacy view
        return new Content(
            view: $this->getTemplate(),
            with: $this->getTemplateData(),
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }

    /**
     * Get the email template path.
     */
    abstract protected function getTemplate(): string;

    /**
     * Get the email subject line.
     */
    abstract protected function getSubject(): string;

    /**
     * Get the data to pass to the email template.
     */
    protected function getTemplateData(): array
    {
        $templateData = [
            'user' => $this->user,
            'notificationType' => $this->notificationType,
            'appName' => config('app.name', 'Meo Mai Moi'),
            'appUrl' => config('app.url'),
        ];

        // Add specific data based on notification type
        if (isset($this->data['pet_id'])) {
            $templateData['pet'] = Pet::find($this->data['pet_id']);
        }

        if (isset($this->data['helper_profile_id'])) {
            $templateData['helperProfile'] = HelperProfile::find($this->data['helper_profile_id']);
        }

        if (isset($this->data['placement_request_id'])) {
            $templateData['placementRequest'] = PlacementRequest::find($this->data['placement_request_id']);
        }

        // Add action URL for deep linking
        $templateData['actionUrl'] = $this->getActionUrl();

        // Add unsubscribe URL
        $templateData['unsubscribeUrl'] = $this->getUnsubscribeUrl();

        return array_merge($templateData, $this->data);
    }

    /**
     * Get the action URL for the notification.
     */
    protected function getActionUrl(): string
    {
        $baseUrl = config('app.url');

        return match ($this->notificationType) {
            NotificationType::PLACEMENT_REQUEST_RESPONSE => $baseUrl.'/requests',
            NotificationType::PLACEMENT_REQUEST_ACCEPTED => $baseUrl.'/requests',
            NotificationType::HELPER_RESPONSE_ACCEPTED => $baseUrl.'/requests',
            NotificationType::HELPER_RESPONSE_REJECTED => $baseUrl.'/requests',
            default => $baseUrl,
        };
    }

    /**
     * Get the unsubscribe URL.
     */
    protected function getUnsubscribeUrl(): string
    {
        $unsubscribeService = app(UnsubscribeService::class);

        return $unsubscribeService->generateUnsubscribeUrl($this->user, $this->notificationType);
    }
}
