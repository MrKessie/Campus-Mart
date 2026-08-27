<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('messages', function (Blueprint $table) {
            $table->boolean('deleted_for_buyer')->default(false)->after('image');
            $table->boolean('deleted_for_seller')->default(false)->after('deleted_for_buyer');
            $table->boolean('is_deleted_for_everyone')->default(false)->after('deleted_for_seller');
            $table->string('reaction')->nullable()->after('is_deleted_for_everyone');
        });
    }

    public function down(): void {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['deleted_for_buyer', 'deleted_for_seller', 'is_deleted_for_everyone', 'reaction']);
        });
    }
};
