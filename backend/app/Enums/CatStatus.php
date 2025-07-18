<?php

namespace App\Enums;

enum CatStatus: string
{
    case ACTIVE = 'active';
    case LOST = 'lost';
    case DECEASED = 'deceased';
    case DELETED = 'deleted';
}