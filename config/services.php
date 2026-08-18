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

    'microsoft' => [
        'client_id' => env('MICROSOFT_OAUTH_CLIENT_ID', env('AZURE_CLIENT_ID')),
        'client_secret' => env('MICROSOFT_OAUTH_CLIENT_SECRET', env('AZURE_CLIENT_SECRET')),
        'redirect' => env('MICROSOFT_OAUTH_REDIRECT_URI', env('AZURE_REDIRECT_URI')),
        'tenant' => env('MICROSOFT_OAUTH_TENANT', env('AZURE_TENANT_ID', 'common')),
        'scopes' => ['openid', 'profile', 'email'],
        'allow_silent_auth' => false,
    ],

];