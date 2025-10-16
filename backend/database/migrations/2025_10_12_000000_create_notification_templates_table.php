<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_templates', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // App\\Enums\\NotificationType value
            $table->string('channel'); // email | in_app (future: sms, push)
            $table->string('locale', 10)->default('en');
            $table->text('subject_template')->nullable();
            $table->longText('body_template');
            $table->string('engine', 16)->default('blade'); // blade | markdown | text
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['type', 'channel', 'locale']);
            $table->index(['type', 'channel']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_templates');
    }
};
