<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'message',
        'is_read',
        'link',
        'type',
        'data',
        'read_at',
        'delivered_at',
        'failed_at',
        'failure_reason',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'data' => 'array',
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
        return $query->where('is_read', false);
    }

    /**
     * Scope for read notifications.
     */
    public function scopeRead($query)
    {
        return $query->where('is_read', true);
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
}
