<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Call extends Model
{
    use HasFactory;

    protected $fillable = [
        'window_id',
        'called_number',
        'called_at',
        'staff_email',
    ];

    public function window(): BelongsTo
    {
        return $this->belongsTo(Window::class);
    }
}