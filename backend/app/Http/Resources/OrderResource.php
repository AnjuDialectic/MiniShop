<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_code' => $this->order_code,
            'customer_name' => $this->customer_name,
            'customer_email' => $this->customer_email,
            'notes' => $this->notes,
            'status' => $this->status,
            'total_quantity' => (int) $this->total_quantity,
            'items_count' => isset($this->items_count)
                ? (int) $this->items_count
                : ($this->relationLoaded('items') ? $this->items->count() : 0),
            'total_amount' => (int) $this->total_amount,
            'created_at' => $this->created_at?->toIso8601String(),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
