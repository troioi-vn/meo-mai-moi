<?php

namespace App\Enums;

enum PlacementRequestType: string
{
    case FOSTER_PAYED = 'foster_payed';
    case FOSTER_FREE = 'foster_free';
    case PERMANENT = 'permanent';
}
