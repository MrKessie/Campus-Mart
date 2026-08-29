<?php
namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageDeleted implements ShouldBroadcastNow {
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $messageId;
    public $conversationId;
    public $message;

    public function __construct(Message $message) {
        $this->messageId = $message->id;
        $this->conversationId = $message->conversation_id;
        $this->message = $message;
    }

    public function broadcastOn() {
        return new PrivateChannel('conversation.' . $this->conversationId);
    }

    public function broadcastAs() {
        return 'MessageDeleted';
    }

    public function broadcastWith() {
        return [
            'message_id'      => $this->messageId,
            'conversation_id' => $this->conversationId,
            'message'         => $this->message,
        ];
    }
}
