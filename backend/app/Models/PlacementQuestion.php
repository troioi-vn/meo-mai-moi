<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PlacementQuestionStatus;
use Database\Factories\PlacementQuestionFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A public question asked about a pet from one of its placement listings.
 *
 * Anyone can ask, including logged-out visitors. Nothing is public until
 * someone who can manage the pet's placements answers or approves it.
 */
class PlacementQuestion extends Model
{
    /** @use HasFactory<PlacementQuestionFactory> */
    use HasFactory;

    protected $fillable = [
        'pet_id',
        'placement_request_id',
        'asker_name',
        'asker_email',
        'asker_email_confirmed_at',
        'email_confirmation_token_hash',
        'email_confirmation_expires_at',
        'asker_ip',
        'question',
        'question_locale',
        'answer',
        'answer_locale',
        'answered_by_user_id',
        'answered_by_name',
        'answered_at',
        'status',
        'published_at',
        'hidden_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'status' => PlacementQuestionStatus::class,
        'asker_email_confirmed_at' => 'datetime',
        'email_confirmation_expires_at' => 'datetime',
        'answered_at' => 'datetime',
        'published_at' => 'datetime',
        'hidden_at' => 'datetime',
    ];

    /**
     * The confirmation token and the asker's address never leave the server as
     * part of an API payload, so they are hidden even if a resource forgets.
     *
     * @var list<string>
     */
    protected $hidden = [
        'email_confirmation_token_hash',
        'asker_email',
        'asker_ip',
    ];

    /**
     * @return BelongsTo<Pet, $this>
     */
    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    /**
     * @return BelongsTo<PlacementRequest, $this>
     */
    public function placementRequest(): BelongsTo
    {
        return $this->belongsTo(PlacementRequest::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function answeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'answered_by_user_id');
    }

    /**
     * @param  Builder<$this>  $query
     * @return Builder<$this>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', PlacementQuestionStatus::PUBLISHED);
    }

    /**
     * @param  Builder<$this>  $query
     * @return Builder<$this>
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', PlacementQuestionStatus::PENDING);
    }

    public function isAnswered(): bool
    {
        return is_string($this->answer) && trim($this->answer) !== '';
    }

    public function isPublic(): bool
    {
        return $this->status->isPublic();
    }

    /**
     * The asker only hears back about an answer if they proved the address is
     * theirs. An unconfirmed address is never mailed and never retained.
     */
    public function wantsAnswerNotification(): bool
    {
        return $this->asker_email !== null && $this->asker_email_confirmed_at !== null;
    }
}
