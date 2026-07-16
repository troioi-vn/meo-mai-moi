<?php

declare(strict_types=1);

namespace App\Enums;

enum LedgerCategoryApplicability: string
{
    case INCOME = 'income';
    case EXPENSE = 'expense';
    case BOTH = 'both';

    public function accepts(LedgerTransactionType $type): bool
    {
        return $this === self::BOTH || $this->value === $type->value;
    }
}
