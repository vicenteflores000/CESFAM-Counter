<?php

namespace Tests\Feature;

use App\Models\Section;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CounterResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_resets_the_section_and_all_windows_to_zero(): void
    {
        $section = Section::create([
            'code' => 'A',
            'name' => 'Sección A',
            'current_number' => 12,
        ]);

        Window::create([
            'section_id' => $section->id,
            'window_number' => 1,
            'current_number' => 7,
        ]);

        Window::create([
            'section_id' => $section->id,
            'window_number' => 2,
            'current_number' => 5,
        ]);

        $response = $this->withSession(['sectionCode' => $section->code])
            ->postJson('/api/reset');

        $response->assertOk();

        $this->assertDatabaseHas('sections', [
            'id' => $section->id,
            'current_number' => 0,
        ]);

        $this->assertDatabaseHas('windows', [
            'section_id' => $section->id,
            'window_number' => 1,
            'current_number' => 0,
        ]);

        $this->assertDatabaseHas('windows', [
            'section_id' => $section->id,
            'window_number' => 2,
            'current_number' => 0,
        ]);
    }
}
