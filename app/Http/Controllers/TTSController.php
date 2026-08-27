<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TTSController extends Controller
{
    /**
     * Synthesize and stream speech audio in natural Spanish (female).
     * Caches generated MP3 files locally to achieve sub-millisecond responses on repeated calls.
     */
    public function speak(Request $request)
    {
        $text = trim(strip_tags((string) $request->query('text', '')));
        if ($text === '') {
            return response()->json(['error' => 'No text provided'], 400);
        }

        // Limit maximum length for safety
        if (mb_strlen($text) > 300) {
            $text = mb_substr($text, 0, 300);
        }

        $lang = (string) $request->query('lang', 'es-US');
        $cacheDir = storage_path('app/tts');

        if (!File::isDirectory($cacheDir)) {
            File::makeDirectory($cacheDir, 0755, true);
        }

        $hash = md5($lang . '_' . mb_strtolower($text));
        $filePath = $cacheDir . DIRECTORY_SEPARATOR . $hash . '.mp3';

        if (File::exists($filePath) && filesize($filePath) > 0) {
            return $this->streamMp3($filePath);
        }

        // Fetch audio stream from Google TTS
        try {
            $url = 'https://translate.google.com/translate_tts?' . http_build_query([
                'ie' => 'UTF-8',
                'tl' => $lang,
                'client' => 'tw-ob',
                'q' => $text,
            ]);

            $response = Http::timeout(4)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer' => 'https://translate.google.com/',
                ])
                ->get($url);

            if ($response->successful() && strlen($response->body()) > 100) {
                File::put($filePath, $response->body());
                return $this->streamMp3($filePath);
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['error' => 'TTS synthesis unavailable'], 502);
    }

    private function streamMp3(string $filePath): BinaryFileResponse
    {
        return response()->file($filePath, [
            'Content-Type' => 'audio/mpeg',
            'Accept-Ranges' => 'bytes',
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}

