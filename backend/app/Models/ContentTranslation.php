<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Spatie\Translatable\HasTranslations;

class ContentTranslation extends Model
{
    use HasFactory;
    use HasTranslations;

    public const STATUS_PENDING = 'pending';

    public const STATUS_TRANSLATED = 'translated';

    public const STATUS_FAILED = 'failed';

    /** @var list<string> */
    public array $translatable = ['text'];

    protected $fillable = [
        'translatable_type',
        'translatable_id',
        'field',
        'source_locale',
        'source_hash',
        'text',
        'status',
        'error',
        'translated_at',
    ];

    protected $casts = [
        'translated_at' => 'datetime',
    ];

    /**
     * @return MorphTo<Model, $this>
     */
    public function translatable(): MorphTo
    {
        return $this->morphTo();
    }
}
