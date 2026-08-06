<?php

return [

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'port' => env('MAILGUN_PORT', 587),
        'username' => env('MAILGUN_USERNAME'),
        'password' => env('MAILGUN_PASSWORD'),
        'api_key' => env('MAILGUN_API_KEY'),
    ],

    'postmark' => [
        'domain' => env('POSTMARK_DOMAIN'),
        'password' => env('POSTMARK_PASSWORD'),
    ],

    'ses' => [
        'domain' => env('SES_DOMAIN'),
        'password' => env('SES_PASSWORD'),
    ],

    'azure' => [
        'client_id' => env('AZURE_CLIENT_ID'),
        'client_secret' => env('AZURE_CLIENT_SECRET'),
        'redirect' => env('AZURE_REDIRECT_URI'),
        'tenant' => env('AZURE_TENANT_ID'),
    ],

];