<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Section;
use App\Models\Window;

class WindowSeeder extends Seeder
{
    /**
     * Run the seeder.
     */
    public function run(): void
    {
        $section = Section::firstOrCreate(
            ['code' => 'SOME'],
            ['name' => 'Sección SOME', 'current_number' => 0]
        );

        for ($i = 1; $i <= 5; $i++) {
            Window::updateOrCreate(
                ['section_id' => $section->id, 'window_number' => $i],
                ['current_number' => 0]
            );
        }
    }
}