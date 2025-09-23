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
        'retry_count',
        'next_retry_at',
    ];

    protected $casts = [
        'headers' => 'array',
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'failed_at' => 'datetime',
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
            'sent', 'delivered' => 'success',
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
            'sent' => 'Sent',
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
     * Mark as sent with SMTP response.
     */
    public function markAsSent(?string $smtpResponse = null): void
    {
        $this->update([
            'status' => 'sent',
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
}
