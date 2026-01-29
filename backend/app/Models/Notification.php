<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\NotificationType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
/**
 * @method static \Illuminate\Database\Eloquent\Builder|static pending()
 * @method static \Illuminate\Database\Eloquent\Builder|static delivered()
 * @method static \Illuminate\Database\Eloquent\Builder|static failed()
 * @method static \Illuminate\Database\Eloquent\Builder|static read()
 * @method static \Illuminate\Database\Eloquent\Builder|static unread()
 */

class Notification extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::saving(function (self $notification): void {
            // Keep the redundant fields in sync.
            // Prefer read_at as the canonical source when it is being modified.
            if ($notification->isDirty('read_at')) {
                $notification->is_read = $notification->read_at !== null;

                return;
            }

            // If only is_read was modified, derive read_at from it.
            if ($notification->isDirty('is_read')) {
                $isRead = (bool) $notification->is_read;

                if ($isRead && $notification->read_at === null) {
                    $notification->read_at = now();
                }

                if (! $isRead && $notification->read_at !== null) {
                    $notification->read_at = null;
                }

                return;
            }

            // Default sync.
            $notification->is_read = $notification->read_at !== null;
        });
    }

    protected $fillable = [
        'user_id',
        'message',
        'link',
        'type',
        'data',
        'read_at',
        'delivered_at',
        'failed_at',
        'failure_reason',
        'is_read',
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'delivered_at' => 'datetime',
        'failed_at' => 'datetime',
    ];

    /**
     * Get the user that owns the notification.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the notification type display name.
     */
    public function getTypeDisplayAttribute(): string
    {
        return match ($this->type) {
            'placement_request' => 'Placement Request',
            'transfer_request' => 'Transfer Request',
            'transfer_accepted' => 'Transfer Accepted',
            'transfer_rejected' => 'Transfer Rejected',
            'handover_scheduled' => 'Handover Scheduled',
            'handover_completed' => 'Handover Completed',
            'review_received' => 'Review Received',
            'profile_approved' => 'Profile Approved',
            'profile_rejected' => 'Profile Rejected',
            'system_announcement' => 'System Announcement',
            'deployment' => 'Deployment',
            'new_message' => 'New Message',
            default => ucfirst(str_replace('_', ' ', $this->type ?? 'notification')),
        };
    }

    /**
     * Get the delivery status.
     */
    public function getDeliveryStatusAttribute(): string
    {
        if ($this->failed_at) {
            return 'failed';
        }

        if ($this->delivered_at) {
            return 'delivered';
        }

        return 'pending';
    }

    /**
     * Get the engagement status.
     */
    public function getEngagementStatusAttribute(): string
    {
        if (! $this->delivered_at) {
            return 'not_delivered';
        }

        if ($this->read_at) {
            return 'read';
        }

        return 'delivered_unread';
    }

    /**
     * Scope for unread notifications.
     */
    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }

    /**
     * Scope for notifications that should appear in the bell UI.
     */
    public function scopeBellVisible($query)
    {
        return $query
            ->where(function ($q): void {
                $q->whereNull('type')
                    ->orWhere('type', '!=', NotificationType::EMAIL_VERIFICATION->value);
            })
            // The bell UI only represents in-app notifications.
            // Email notifications are persisted for delivery/audit but must not affect bell count.
            ->where(function ($q): void {
                $q->whereNull('data->channel')
                    ->orWhere('data->channel', 'like', 'in_app%');
            });
    }

    /**
     * Scope for read notifications.
     */
    public function scopeRead($query)
    {
        return $query->whereNotNull('read_at');
    }

    /**
     * Scope for delivered notifications.
     */
    public function scopeDelivered($query)
    {
        return $query->whereNotNull('delivered_at');
    }

    /**
     * Scope for failed notifications.
     */
    public function scopeFailed($query)
    {
        return $query->whereNotNull('failed_at');
    }

    /**
     * Scope for pending notifications.
     */
    public function scopePending($query)
    {
        return $query->whereNull('delivered_at')->whereNull('failed_at');
    }

    /**
     * Check if the notification has been read.
     */
    public function isRead(): bool
    {
        return $this->read_at !== null;
    }

    /**
     * Mark the notification as read.
     */
    public function markAsRead(): void
    {
        if (! $this->isRead()) {
            $this->update(['read_at' => now()]);
        }
    }

    /**
     * Mark the notification as unread.
     */
    public function markAsUnread(): void
    {
        if ($this->isRead()) {
            $this->update(['read_at' => null]);
        }
    }

    public function getBellTitle(): string
    {
        $title = data_get($this->data, 'title');
        if (is_string($title) && trim($title) !== '') {
            return $title;
        }

        if (is_string($this->message) && trim($this->message) !== '') {
            return $this->message;
        }

        if (is_string($this->type) && $this->type !== '') {
            $type = NotificationType::tryFrom($this->type);
            if ($type) {
                return $type->getLabel();
            }

            return $this->type_display;
        }

        return 'Notification';
    }

    public function getBellBody(): ?string
    {
        $body = data_get($this->data, 'body');
        if ($body === null) {
            return null;
        }

        if (is_string($body)) {
            $body = trim($body);

            return $body === '' ? null : $body;
        }

        return null;
    }

    public function getBellLevel(): string
    {
        $level = data_get($this->data, 'level');
        if (is_string($level) && $level !== '') {
            return $level;
        }

        return 'info';
    }
}
