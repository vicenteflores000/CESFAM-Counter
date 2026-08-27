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
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('identifier', 50)->nullable(); // RUT u otro identificador
            $table->string('station_number', 20)->nullable(); // Box o Ventanilla que lo llamó
            $table->string('status', 30)->default('pending'); // 'pending', 'calling', 'attended', 'cancelled'
            $table->timestamp('called_at')->nullable();
            $table->string('called_by')->nullable(); // Email del funcionario
            $table->timestamps();
        });

        Schema::table('calls', function (Blueprint $table) {
            $table->string('patient_name')->nullable()->after('called_number');
            $table->string('patient_identifier')->nullable()->after('patient_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('calls', function (Blueprint $table) {
            $table->dropColumn(['patient_name', 'patient_identifier']);
        });
        Schema::dropIfExists('patients');
    }
};

