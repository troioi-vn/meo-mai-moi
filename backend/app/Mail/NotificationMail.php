<?php

namespace App\Mail;

use App\Models\User;
use App\Models\Cat;
use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Enums\NotificationType;
use App\Services\UnsubscribeService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

abstract class NotificationMail extends Mailable
{
    use Queueable, SerializesModels;

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
        return new Envelope(
            subject: $this->getSubject(),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
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
        if (isset($this->data['cat_id'])) {
            $templateData['cat'] = Cat::find($this->data['cat_id']);
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
        
        return match($this->notificationType) {
            NotificationType::PLACEMENT_REQUEST_RESPONSE => $baseUrl . '/requests',
            NotificationType::PLACEMENT_REQUEST_ACCEPTED => $baseUrl . '/requests',
            NotificationType::HELPER_RESPONSE_ACCEPTED => $baseUrl . '/requests',
            NotificationType::HELPER_RESPONSE_REJECTED => $baseUrl . '/requests',
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