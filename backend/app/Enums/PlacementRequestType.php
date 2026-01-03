<?php

namespace App\Enums;

enum PlacementRequestType: string
{
    case FOSTER_PAID = 'foster_paid';
    case FOSTER_FREE = 'foster_free';
    case PERMANENT = 'permanent';
    case PET_SITTING = 'pet_sitting';
}
