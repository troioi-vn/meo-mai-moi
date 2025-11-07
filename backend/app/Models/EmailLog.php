<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'notification_id',
        'email_configuration_id',
        'recipient_email',
        'subject',
        'body',
        'headers',
        'status',
        'smtp_response',
        'error_message',
        'sent_at',
        'delivered_at',
        'failed_at',
        'opened_at',
        'clicked_at',
        'unsubscribed_at',
        'complained_at',
        'permanent_fail_at',
        'retry_count',
        'next_retry_at',
    ];

    protected $casts = [
        'headers' => 'array',
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'failed_at' => 'datetime',
        'opened_at' => 'datetime',
        'clicked_at' => 'datetime',
        'unsubscribed_at' => 'datetime',
        'complained_at' => 'datetime',
        'permanent_fail_at' => 'datetime',
        'next_retry_at' => 'datetime',
    ];

    /**
     * Get the user that this email was sent to.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the notification that triggered this email.
     */
    public function notification(): BelongsTo
    {
        return $this->belongsTo(Notification::class);
    }

    /**
     * Get the email configuration used for this email.
     */
    public function emailConfiguration(): BelongsTo
    {
        return $this->belongsTo(EmailConfiguration::class);
    }

    /**
     * Get the status badge color.
     */
    public function getStatusColor(): string
    {
        return match ($this->status) {
            'delivered' => 'success',
            'accepted' => 'warning',
            'failed', 'bounced' => 'danger',
            'pending' => 'warning',
            default => 'gray',
        };
    }

    /**
     * Get the status display name.
     */
    public function getStatusDisplayName(): string
    {
        return match ($this->status) {
            'pending' => 'Pending',
            'accepted' => 'Accepted',
            'delivered' => 'Delivered',
            'failed' => 'Failed',
            'bounced' => 'Bounced',
            default => ucfirst($this->status),
        };
    }

    /**
     * Check if this email can be retried.
     */
    public function canRetry(): bool
    {
        return in_array($this->status, ['failed', 'bounced']) && $this->retry_count < 5;
    }

    /**
     * Mark as accepted (Mailgun accepted for delivery).
     */
    public function markAsAccepted(?string $smtpResponse = null): void
    {
        $this->update([
            'status' => 'accepted',
            'smtp_response' => $smtpResponse,
            'sent_at' => now(),
            'error_message' => null,
        ]);
    }

    /**
     * Mark as failed with error message.
     */
    public function markAsFailed(string $errorMessage): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $errorMessage,
            'failed_at' => now(),
            'retry_count' => $this->retry_count + 1,
        ]);
    }

    /**
     * Mark as delivered (when we get delivery confirmation).
     */
    public function markAsDelivered(): void
    {
        $this->update([
            'status' => 'delivered',
            'delivered_at' => now(),
        ]);
    }

    /**
     * Mark as opened (when recipient opens the email).
     */
    public function markAsOpened(): void
    {
        $this->update([
            'opened_at' => now(),
        ]);
    }

    /**
     * Mark as clicked (when recipient clicks a link).
     */
    public function markAsClicked(): void
    {
        $this->update([
            'clicked_at' => now(),
        ]);
    }

    /**
     * Mark as unsubscribed (when recipient unsubscribes).
     */
    public function markAsUnsubscribed(): void
    {
        $this->update([
            'unsubscribed_at' => now(),
        ]);
    }

    /**
     * Mark as complained (when recipient marks as spam).
     */
    public function markAsComplained(): void
    {
        $this->update([
            'complained_at' => now(),
        ]);
    }

    /**
     * Mark as permanent failure.
     */
    public function markAsPermanentFail(string $reason): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $reason,
            'failed_at' => now(),
            'permanent_fail_at' => now(),
            'retry_count' => $this->retry_count + 1,
        ]);
    }
}
