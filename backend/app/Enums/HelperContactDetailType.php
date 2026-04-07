<?php

declare(strict_types=1);

namespace App\Enums;

enum HelperContactDetailType: string
{
    case TELEGRAM = 'telegram';
    case WHATSAPP = 'whatsapp';
    case ZALO = 'zalo';
    case FACEBOOK = 'facebook';
    case INSTAGRAM = 'instagram';
    case X_TWITTER = 'x_twitter';
    case LINKEDIN = 'linkedin';
    case TIKTOK = 'tiktok';
    case WECHAT = 'wechat';
    case VIBER = 'viber';
    case LINE = 'line';
    case WEBSITE = 'website';
    case EMAIL = 'email';
    case OTHER = 'other';

    public function isUniquePerProfile(): bool
    {
        return $this !== self::OTHER;
    }
}
