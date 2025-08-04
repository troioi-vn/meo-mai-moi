<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HelperProfilePhoto extends Model
{
    protected $fillable = [
        'helper_profile_id',
        'path',
    ];
}
