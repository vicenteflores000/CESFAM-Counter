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
        Schema::table('sections', function (Blueprint $table) {
            $table->string('station_type', 30)->default('ventanilla')->after('name'); // 'ventanilla' o 'box'
            $table->string('call_type', 30)->default('number')->after('station_type'); // 'number' o 'patient_list'
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            $table->dropColumn(['station_type', 'call_type']);
        });
    }
};

