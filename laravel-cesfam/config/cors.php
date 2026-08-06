<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | This file configures CORS for the application. These settings are
    | intentionally permissive for use with embedded widgets (MagicINFO).
    |
    */

    'allowed_origins' => ['*'],
    'allowed_methods' => ['*'],
    'allowed_headers' => ['*'],
    'supports_credentials' => false,
    'max_age' => 0,
    'exposed_headers' => [],
];
