<?php

namespace Tests\Feature;

use Tests\TestCase;

class SectorRouteTest extends TestCase
{
    public function test_patient_view_renders_without_code(): void
    {
        $response = $this->get('/');
        $response->assertOk();
        $response->assertSee('window.PATIENT_SECTION_CODE = null', false);
    }

    public function test_patient_view_renders_with_query_param(): void
    {
        $response = $this->get('/?code=SOME');
        $response->assertOk();
        $response->assertSee('window.PATIENT_SECTION_CODE = "SOME"', false);
    }

    public function test_patient_view_renders_with_route_param(): void
    {
        $response = $this->get('/some');
        $response->assertOk();
        $response->assertSee('window.PATIENT_SECTION_CODE = "SOME"', false);

        $responseSector = $this->get('/sector/farmacia');
        $responseSector->assertOk();
        $responseSector->assertSee('window.PATIENT_SECTION_CODE = "FARMACIA"', false);
    }
}

