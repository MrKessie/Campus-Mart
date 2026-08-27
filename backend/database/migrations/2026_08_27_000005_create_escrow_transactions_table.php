<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('escrow_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained()->onDelete('cascade');
            $table->foreignId('buyer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('seller_id')->constrained('users')->onDelete('cascade');
            $table->decimal('amount', 10, 2);
            $table->string('reference')->unique();
            $table->string('paystack_access_code')->nullable();
            $table->enum('status', ['pending', 'held_in_escrow', 'released', 'refunded', 'disputed'])->default('pending');
            $table->string('payment_method')->default('mobile_money');
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('escrow_transactions');
    }
};
