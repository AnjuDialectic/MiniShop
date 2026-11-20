<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class CheckoutConflictException extends RuntimeException
{
    /**
     * @param  list<array{
     *     product_id: int,
     *     product_name: string|null,
     *     requested_quantity: int,
     *     available_stock: int,
     *     reason: string
     * }>  $conflicts
     */
    public function __construct(
        private readonly array $conflicts,
        string $message = 'Stok produk tidak mencukupi untuk menyelesaikan pesanan.',
    ) {
        parent::__construct($message, 409);
    }

    /**
     * Per-item conflict details including current available stock.
     *
     * @return list<array{
     *     product_id: int,
     *     product_name: string|null,
     *     requested_quantity: int,
     *     available_stock: int,
     *     reason: string
     * }>
     */
    public function conflicts(): array
    {
        return $this->conflicts;
    }
}
