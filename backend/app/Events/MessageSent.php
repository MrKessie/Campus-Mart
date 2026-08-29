<?php
namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow {
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    public function __construct(Message $message) {
        $this->message = $message->load(['sender', 'replyTo']);
    }

    public function broadcastOn() {
        return new PrivateChannel('conversation.' . $this->message->conversation_id);
    }

    public function broadcastAs() {
        return 'MessageSent';
    }

    public function broadcastWith() {
        return [
            'message' => $this->message,
        ];
    }
}
