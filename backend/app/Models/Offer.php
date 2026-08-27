<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Offer extends Model {
    use HasFactory;

    protected $fillable = [
        'listing_id',
        'buyer_id',
        'seller_id',
        'offer_price',
        'counter_price',
        'message',
        'status',
    ];

    protected $casts = [
        'offer_price'   => 'decimal:2',
        'counter_price' => 'decimal:2',
    ];

    public function listing() {
        return $this->belongsTo(Listing::class);
    }

    public function buyer() {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller() {
        return $this->belongsTo(User::class, 'seller_id');
    }
}
