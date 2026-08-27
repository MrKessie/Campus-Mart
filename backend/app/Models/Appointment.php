<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model {
    use HasFactory;

    protected $fillable = [
        'listing_id',
        'client_id',
        'provider_id',
        'appointment_date',
        'time_slot',
        'notes',
        'status',
    ];

    protected $casts = [
        'appointment_date' => 'date:Y-m-d',
    ];

    public function listing() {
        return $this->belongsTo(Listing::class);
    }

    public function client() {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function provider() {
        return $this->belongsTo(User::class, 'provider_id');
    }
}
