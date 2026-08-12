<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ErrorEventFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ErrorEvent extends Model
{
    /** @use HasFactory<ErrorEventFactory> */
    use HasFactory;

    protected $fillable = [
        'source',
        'fingerprint',
        'message',
        'exception_class',
        'stack',
        'route',
        'method',
        'status_code',
        'app_version',
        'user_id',
        'context',
        'occurred_at',
    ];

    protected $casts = [
        'status_code' => 'integer',
        'context' => 'array',
        'occurred_at' => 'immutable_datetime',
    ];
}
