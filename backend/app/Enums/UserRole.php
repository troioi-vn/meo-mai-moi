<?php

namespace App\Enums;

enum UserRole: string
{
    case ADMIN = 'admin';
    case CAT_OWNER = 'cat_owner';
    case HELPER = 'helper';
    case VIEWER = 'viewer';
}
