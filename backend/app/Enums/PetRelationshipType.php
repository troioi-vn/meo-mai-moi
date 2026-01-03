<?php

namespace App\Enums;

enum PetRelationshipType: string
{
    case OWNER = 'owner';
    case FOSTER = 'foster';
    case SITTER = 'sitter';
    case EDITOR = 'editor';
    case VIEWER = 'viewer';
}
