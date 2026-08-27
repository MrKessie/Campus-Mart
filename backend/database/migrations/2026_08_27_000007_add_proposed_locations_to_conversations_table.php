<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('buyer_proposed_location')->nullable()->after('exchange_location');
            $table->string('seller_proposed_location')->nullable()->after('buyer_proposed_location');
        });
    }

    public function down(): void {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn(['buyer_proposed_location', 'seller_proposed_location']);
        });
    }
};
