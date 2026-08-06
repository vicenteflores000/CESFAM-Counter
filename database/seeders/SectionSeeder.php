<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Section;

class SectionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Section::updateOrCreate(
            ['code' => 'SOME'],
            ['name' => 'Sección SOME', 'current_number' => 0]
        );
    }
}
