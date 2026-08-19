<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description');
            $table->decimal('price', 10, 2);
            $table->string('image')->nullable();
            $table->json('images')->nullable();
            $table->enum('status', ['available', 'sold'])->default('available');
            $table->boolean('is_service')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('listings');
    }
};