<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    private const PERMISSIONS = [
        'view_any_waitlist::entry',
        'view_waitlist::entry',
        'create_waitlist::entry',
        'update_waitlist::entry',
        'delete_waitlist::entry',
        'delete_any_waitlist::entry',
    ];

    public function up(): void
    {
        Schema::dropIfExists('waitlist_entries');

        // role_has_permissions and model_has_permissions cascade on delete.
        DB::table('permissions')->whereIn('name', self::PERMISSIONS)->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Schema::create('waitlist_entries', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('status')->default('pending');
            $table->string('locale', 5)->nullable();
            $table->timestamp('invited_at')->nullable();
            $table->timestamps();
        });
    }
};
