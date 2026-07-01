<?php

declare(strict_types=1);

namespace App\Services\Offline;

use Illuminate\Database\Eloquent\Model;

final class OfflineVersionService
{
    public function serializeVersion(Model $model): string
    {
        $updatedAt = $model->updated_at;

        if ($updatedAt === null) {
            return '';
        }

        return $updatedAt->toJSON();
    }

    public function matchesBaseVersion(Model $model, mixed $baseVersion): bool
    {
        if (! is_string($baseVersion) || trim($baseVersion) === '') {
            return true;
        }

        return $this->serializeVersion($model) === trim($baseVersion);
    }
}
