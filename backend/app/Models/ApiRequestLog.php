<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiRequestLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'method',
        'path',
        'route_uri',
        'status_code',
        'auth_mode',
    ];

    protected $casts = [
        'status_code' => 'integer',
    ];
}
