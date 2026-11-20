<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class OrderSeeder extends Seeder
{
    /**
     * Seed 2 realistic historical orders with item snapshots for immediate Admin Orders review.
     */
    public function run(): void
    {
        $productsByName = Product::query()->get()->keyBy('name');

        $sampleOrders = [
            [
                'order_code' => 'ORD-20261119-0001',
                'customer_name' => 'Nadia Kusuma',
                'customer_email' => 'nadia.kusuma@example.com',
                'notes' => 'Mohon bungkus kardus tambahan karena untuk kado.',
                'created_at' => Carbon::now()->subDay()->setTime(10, 15),
                'items' => [
                    ['name' => 'Mechanical Keyboard Keychron K2 Wireless', 'quantity' => 1],
                    ['name' => 'Stand Laptop Aluminum Foldable', 'quantity' => 2],
                ],
            ],
            [
                'order_code' => 'ORD-20261120-0002',
                'customer_name' => 'Raka Pratama',
                'customer_email' => 'raka.pratama@example.com',
                'notes' => 'Kirim sore hari setelah pukul 15.00 WIB.',
                'created_at' => Carbon::now()->subHours(3),
                'items' => [
                    ['name' => 'Jaket Overshirt Katun Twill Olive', 'quantity' => 1],
                    ['name' => 'Tumbler Vacuum Insulated 600ml Matte Black', 'quantity' => 2],
                    ['name' => 'Totebag Kanvas Heavyweight 16oz', 'quantity' => 1],
                ],
            ],
        ];

        foreach ($sampleOrders as $sample) {
            if (Order::query()->where('order_code', $sample['order_code'])->exists()) {
                continue;
            }

            $totalAmount = 0;
            $totalQuantity = 0;
            $itemsToCreate = [];

            foreach ($sample['items'] as $line) {
                /** @var Product|null $product */
                $product = $productsByName->get($line['name']);
                if ($product === null) {
                    continue;
                }

                $unitPrice = (int) $product->price;
                $quantity = (int) $line['quantity'];
                $subtotal = $unitPrice * $quantity;

                $totalAmount += $subtotal;
                $totalQuantity += $quantity;

                $itemsToCreate[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_image_url' => $product->image_url,
                    'unit_price' => $unitPrice,
                    'quantity' => $quantity,
                    'subtotal' => $subtotal,
                    'created_at' => $sample['created_at'],
                    'updated_at' => $sample['created_at'],
                ];
            }

            if ($itemsToCreate === []) {
                continue;
            }

            $order = new Order([
                'order_code' => $sample['order_code'],
                'customer_name' => $sample['customer_name'],
                'customer_email' => $sample['customer_email'],
                'notes' => $sample['notes'],
                'total_amount' => $totalAmount,
                'total_quantity' => $totalQuantity,
                'status' => 'completed',
            ]);
            $order->created_at = $sample['created_at'];
            $order->updated_at = $sample['created_at'];
            $order->save();

            $order->items()->createMany($itemsToCreate);
        }
    }
}
