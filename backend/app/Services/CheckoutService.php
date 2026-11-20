<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\CheckoutConflictException;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

final class CheckoutService
{
    /**
     * Execute an atomic checkout: lock/validate active products in deterministic ID order,
     * deduct stock conditionally, compute totals server-side, and persist order snapshots.
     *
     * @param  array{
     *     customer_name: string,
     *     customer_email?: string|null,
     *     notes?: string|null,
     *     items: list<array{product_id: int|string, quantity: int|string}>
     * }  $payload
     *
     * @throws CheckoutConflictException
     */
    public function execute(array $payload): Order
    {
        /** @var array<int, int> $requestedQuantities */
        $requestedQuantities = [];

        foreach ($payload['items'] as $item) {
            $requestedQuantities[(int) $item['product_id']] = (int) $item['quantity'];
        }

        // Deterministic ascending ID order prevents deadlocks across concurrent multi-item checkouts.
        ksort($requestedQuantities, SORT_NUMERIC);
        $productIds = array_keys($requestedQuantities);

        return DB::transaction(function () use ($payload, $requestedQuantities, $productIds): Order {
            $productQuery = Product::query()
                ->whereIn('id', $productIds)
                ->orderBy('id', 'asc');

            if (DB::getDriverName() === 'pgsql') {
                $productQuery->lockForUpdate();
            }

            $products = $productQuery->get()->keyBy('id');

            $conflicts = [];
            $missingIds = [];

            foreach ($requestedQuantities as $productId => $requestedQty) {
                /** @var Product|null $product */
                $product = $products->get($productId);

                if ($product === null) {
                    $missingIds[] = $productId;

                    continue;
                }

                if ($product->stock < $requestedQty) {
                    $conflicts[] = [
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'requested_quantity' => $requestedQty,
                        'available_stock' => (int) $product->stock,
                        'reason' => 'INSUFFICIENT_STOCK',
                    ];
                }
            }

            if ($missingIds !== []) {
                $trashedNames = Product::onlyTrashed()
                    ->whereIn('id', $missingIds)
                    ->pluck('name', 'id');

                foreach ($missingIds as $missingId) {
                    $conflicts[] = [
                        'product_id' => $missingId,
                        'product_name' => $trashedNames->get($missingId),
                        'requested_quantity' => $requestedQuantities[$missingId],
                        'available_stock' => 0,
                        'reason' => 'PRODUCT_UNAVAILABLE',
                    ];
                }
            }

            if ($conflicts !== []) {
                usort($conflicts, static fn (array $a, array $b): int => $a['product_id'] <=> $b['product_id']);

                throw new CheckoutConflictException($conflicts);
            }

            $now = now();
            $totalAmount = 0;
            $totalQuantity = 0;
            $orderItemsData = [];

            foreach ($requestedQuantities as $productId => $requestedQty) {
                /** @var Product $product */
                $product = $products->get($productId);

                // Conditional atomic stock deduction protects both SQLite and PostgreSQL against races.
                $affectedRows = DB::table('products')
                    ->where('id', $productId)
                    ->whereNull('deleted_at')
                    ->where('stock', '>=', $requestedQty)
                    ->decrement('stock', $requestedQty, ['updated_at' => $now]);

                if ($affectedRows !== 1) {
                    $freshProduct = Product::query()->find($productId);

                    throw new CheckoutConflictException([
                        [
                            'product_id' => $productId,
                            'product_name' => $freshProduct?->name ?? $product->name,
                            'requested_quantity' => $requestedQty,
                            'available_stock' => $freshProduct !== null ? (int) $freshProduct->stock : 0,
                            'reason' => $freshProduct === null ? 'PRODUCT_UNAVAILABLE' : 'INSUFFICIENT_STOCK',
                        ],
                    ]);
                }

                $unitPrice = (int) $product->price;
                $subtotal = $unitPrice * $requestedQty;

                $totalAmount += $subtotal;
                $totalQuantity += $requestedQty;

                $orderItemsData[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_image_url' => $product->image_url,
                    'unit_price' => $unitPrice,
                    'quantity' => $requestedQty,
                    'subtotal' => $subtotal,
                ];
            }

            $order = Order::query()->create([
                'order_code' => $this->generateUniqueOrderCode(),
                'customer_name' => $payload['customer_name'],
                'customer_email' => $payload['customer_email'] ?? null,
                'notes' => $payload['notes'] ?? null,
                'total_amount' => $totalAmount,
                'total_quantity' => $totalQuantity,
                'status' => 'completed',
            ]);

            $order->items()->createMany($orderItemsData);

            return $order->load('items');
        }, 3);
    }

    /**
     * Generate a human-readable, database-verified unique order code (ORD-YYYYMMDD-XXXXXX).
     */
    private function generateUniqueOrderCode(): string
    {
        $datePrefix = now()->format('Ymd');

        do {
            $suffix = strtoupper(bin2hex(random_bytes(3)));
            $orderCode = sprintf('ORD-%s-%s', $datePrefix, $suffix);
        } while (Order::query()->where('order_code', $orderCode)->exists());

        return $orderCode;
    }
}
