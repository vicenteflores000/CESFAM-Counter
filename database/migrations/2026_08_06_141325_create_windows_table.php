<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('windows', function (Blueprint $table) {
            $table->id();
            $table->integer('window_number')->unique(); // Ventanilla 1, 2, 3, etc.
            $table->integer('current_number')->default(0); // Último número llamado
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('windows');
    }
};