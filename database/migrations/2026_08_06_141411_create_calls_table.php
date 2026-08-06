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
        Schema::create('calls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('window_id')->constrained()->onDelete('cascade');
            $table->integer('called_number'); // Número que se llamó
            $table->timestamp('called_at')->useCurrent(); // Cuando se llamó
            $table->string('staff_email')->nullable(); // Email del funcionario que hizo el llamado
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('calls');
    }
};