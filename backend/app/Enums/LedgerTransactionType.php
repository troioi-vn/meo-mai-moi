<?php

declare(strict_types=1);

namespace App\Enums;

enum LedgerTransactionType: string
{
    case INCOME = 'income';
    case EXPENSE = 'expense';
}
