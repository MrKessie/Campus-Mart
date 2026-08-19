<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Rating extends Model {
    use HasFactory;

    protected $fillable = ['buyer_id', 'seller_id', 'listing_id', 'stars', 'review'];

    public function buyer() {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller() {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function listing() {
        return $this->belongsTo(Listing::class);
    }
}