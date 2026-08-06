<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Window;

class WindowSeeder extends Seeder
{
    /**
     * Run the seeder.
     */
    public function run(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            Window::create([
                'window_number' => $i,
                'current_number' => 0,
            ]);
        }
    }
}