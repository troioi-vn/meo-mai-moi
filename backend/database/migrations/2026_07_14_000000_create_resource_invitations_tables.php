<?php

declare(strict_types=1);

use App\Enums\ResourceInvitationStatus;
use App\Enums\ResourceInvitationType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_invitations', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('token', 64)->unique();
            $table->foreignId('invited_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default(ResourceInvitationStatus::PENDING->value);
            $table->timestampTz('expires_at');
            $table->foreignId('accepted_by_user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->timestampTz('accepted_at')->nullable();
            $table->timestampTz('declined_at')->nullable();
            $table->timestampTz('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['type', 'status']);
            $table->index(['invited_by_user_id', 'status']);
        });

        Schema::create('pet_resource_invitations', function (Blueprint $table) {
            $table->foreignId('resource_invitation_id')
                ->primary()
                ->constrained('resource_invitations')
                ->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained()->cascadeOnDelete();
            $table->string('relationship_type');
            $table->timestamps();

            $table->index(['pet_id', 'relationship_type']);
        });

        if (Schema::hasTable('relationship_invitations')) {
            $rows = DB::table('relationship_invitations')->orderBy('id')->get();

            foreach ($rows as $row) {
                $invitationId = DB::table('resource_invitations')->insertGetId([
                    'type' => ResourceInvitationType::PET->value,
                    'token' => $row->token,
                    'invited_by_user_id' => $row->invited_by_user_id,
                    'status' => $row->status,
                    'expires_at' => $row->expires_at,
                    'accepted_by_user_id' => $row->accepted_by_user_id,
                    'accepted_at' => $row->accepted_at,
                    'declined_at' => $row->declined_at,
                    'revoked_at' => $row->revoked_at,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ]);

                DB::table('pet_resource_invitations')->insert([
                    'resource_invitation_id' => $invitationId,
                    'pet_id' => $row->pet_id,
                    'relationship_type' => $row->relationship_type,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ]);
            }

            Schema::drop('relationship_invitations');
        }
    }

    public function down(): void
    {
        Schema::create('relationship_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invited_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->string('relationship_type');
            $table->string('status')->default('pending');
            $table->timestampTz('expires_at');
            $table->timestampTz('accepted_at')->nullable();
            $table->timestampTz('declined_at')->nullable();
            $table->timestampTz('revoked_at')->nullable();
            $table->foreignId('accepted_by_user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['pet_id', 'status']);
        });

        $invitations = DB::table('resource_invitations')
            ->where('type', ResourceInvitationType::PET->value)
            ->orderBy('id')
            ->get();

        foreach ($invitations as $invitation) {
            $detail = DB::table('pet_resource_invitations')
                ->where('resource_invitation_id', $invitation->id)
                ->first();

            if ($detail === null) {
                continue;
            }

            DB::table('relationship_invitations')->insert([
                'pet_id' => $detail->pet_id,
                'invited_by_user_id' => $invitation->invited_by_user_id,
                'token' => $invitation->token,
                'relationship_type' => $detail->relationship_type,
                'status' => $invitation->status,
                'expires_at' => $invitation->expires_at,
                'accepted_at' => $invitation->accepted_at,
                'declined_at' => $invitation->declined_at,
                'revoked_at' => $invitation->revoked_at,
                'accepted_by_user_id' => $invitation->accepted_by_user_id,
                'created_at' => $invitation->created_at,
                'updated_at' => $invitation->updated_at,
            ]);
        }

        Schema::dropIfExists('pet_resource_invitations');
        Schema::dropIfExists('resource_invitations');
    }
};
