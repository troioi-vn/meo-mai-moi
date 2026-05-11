<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\NotificationTemplateFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class NotificationTemplate extends Model
{
    /** @use HasFactory<NotificationTemplateFactory> */
    use HasFactory;

    protected $fillable = [
        'type',
        'channel',
        'locale',
        'subject_template',
        'body_template',
        'engine',
        'status',
        'version',
        'updated_by_user_id',
    ];

    protected $casts = [
        'version' => 'integer',
    ];

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeFor(Builder $query, string $type, string $channel, string $locale): Builder
    {
        return $query->where('type', $type)
            ->where('channel', $channel)
            ->where('locale', $locale);
    }

    protected static function boot(): void
    {
        parent::boot();

        static::saving(function (self $model): void {
            // Increment semantic version on updates
            if ($model->exists) {
                $model->version = (int) ($model->version ?: 1) + 1;
            } else {
                $model->version = $model->version ?: 1;
            }

            // Track who updated
            if (Auth::check()) {
                $model->updated_by_user_id = Auth::id();
            }
        });
    }
}
