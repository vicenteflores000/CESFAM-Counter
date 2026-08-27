<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TTSTest extends TestCase
{
    public function test_tts_returns_bad_request_when_text_empty(): void
    {
        $response = $this->get('/api/tts?text=');
        $response->assertStatus(400);
    }

    public function test_tts_generates_and_caches_audio(): void
    {
        $fakeAudio = str_repeat('ID3DummyAudioData', 20);

        Http::fake([
            'translate.google.com/*' => Http::response($fakeAudio, 200, ['Content-Type' => 'audio/mpeg']),
        ]);

        $response = $this->get('/api/tts?text=' . urlencode('Número 1, diríjase a ventanilla 1, SOME'));
        
        $response->assertOk();
        $response->assertHeader('Content-Type', 'audio/mpeg');

        // Test second call hits local disk cache without invoking HTTP
        Http::fake([
            'translate.google.com/*' => Http::response('SHOULD_NOT_BE_CALLED', 500),
        ]);

        $cachedResponse = $this->get('/api/tts?text=' . urlencode('Número 1, diríjase a ventanilla 1, SOME'));
        $cachedResponse->assertOk();
        $cachedResponse->assertHeader('Content-Type', 'audio/mpeg');
    }
}

