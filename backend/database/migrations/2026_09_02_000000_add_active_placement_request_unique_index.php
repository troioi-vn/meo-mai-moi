<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const INDEX = 'placement_requests_active_type_unique';

    /**
     * Statuses in which a placement request is considered live. Kept in sync with
     * the conflict check in StorePlacementRequestController.
     */
    private const LIVE_STATUSES = ['open', 'pending_transfer', 'active'];

    public function up(): void
    {
        $this->guardAgainstExistingDuplicates();

        $statuses = implode(', ', array_map(
            static fn (string $status): string => "'".$status."'",
            self::LIVE_STATUSES
        ));

        DB::statement(
            'CREATE UNIQUE INDEX '.self::INDEX.' ON placement_requests (pet_id, request_type) '
            .'WHERE deleted_at IS NULL AND status IN ('.$statuses.')'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS '.self::INDEX);
    }

    /**
     * Refuse to build the index rather than resolve duplicates ourselves.
     *
     * A duplicate here means two live placement requests for one pet, which is a
     * real adoption listing either way. Cancelling one to make the migration pass
     * would be an unlogged, unrecoverable product decision taken by a script.
     */
    private function guardAgainstExistingDuplicates(): void
    {
        $duplicates = DB::table('placement_requests')
            ->select('pet_id', 'request_type')
            ->whereNull('deleted_at')
            ->whereIn('status', self::LIVE_STATUSES)
            ->groupBy('pet_id', 'request_type')
            ->havingRaw('count(*) > 1')
            ->get();

        if ($duplicates->isEmpty()) {
            return;
        }

        $offenders = $duplicates
            ->map(static fn ($row): string => $row->pet_id.':'.$row->request_type)
            ->implode(', ');

        throw new RuntimeException(
            'Cannot add '.self::INDEX.': these pet_id:request_type pairs already have more than one '
            .'live placement request - '.$offenders.'. Resolve them by hand, then re-run this migration.'
        );
    }
};
