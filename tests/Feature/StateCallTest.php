<?php

namespace Tests\Feature;

use App\Models\Section;
use App\Models\Window;
use App\Models\Call;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StateCallTest extends TestCase
{
    use RefreshDatabase;

    public function test_state_returns_last_call_data(): void
    {
        $section = Section::create([
            'code' => 'FAR',
            'name' => 'Farmacia',
            'current_number' => 42,
        ]);

        $window = Window::create([
            'section_id' => $section->id,
            'window_number' => 3,
            'current_number' => 42,
        ]);

        Call::create([
            'window_id' => $window->id,
            'called_number' => 42,
        ]);

        $response = $this->getJson('/api/state');

        $response->assertOk();
        $response->assertJsonStructure([
            'sections',
            'lastCall' => [
                'id',
                'calledNumber',
                'windowNumber',
                'sectionCode',
                'sectionName',
                'calledAt',
            ],
        ]);

        $response->assertJsonPath('lastCall.calledNumber', 42);
        $response->assertJsonPath('lastCall.windowNumber', 3);
        $response->assertJsonPath('lastCall.sectionCode', 'FAR');
        $response->assertJsonPath('lastCall.sectionName', 'Farmacia');
    }

    public function test_next_call_records_and_updates_last_call(): void
    {
        $section = Section::create([
            'code' => 'SOME',
            'name' => 'SOME Central',
            'current_number' => 10,
        ]);

        $response = $this->withSession([
            'sectionCode' => 'SOME',
            'windowNumber' => 2,
        ])->postJson('/api/next');

        $response->assertOk();
        $response->assertJsonPath('lastCall.calledNumber', 11);
        $response->assertJsonPath('lastCall.windowNumber', 2);
        $response->assertJsonPath('lastCall.sectionCode', 'SOME');
    }
}

