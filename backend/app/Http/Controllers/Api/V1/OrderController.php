<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\CheckoutService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class OrderController extends Controller
{
    public function __construct(
        private readonly CheckoutService $checkoutService,
    ) {}

    /**
     * List orders newest-first with item counts (Admin).
     */
    public function index(Request $request): JsonResponse
    {
        $requestedPerPage = $request->integer('per_page');
        $perPage = $requestedPerPage > 0 ? min(100, $requestedPerPage) : 20;

        $orders = Order::query()
            ->withCount('items')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        return ApiResponse::success(
            OrderResource::collection($orders->getCollection()),
            'Daftar pesanan berhasil diambil.',
            200,
            [
                'total' => $orders->total(),
                'per_page' => $orders->perPage(),
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
            ],
        );
    }

    /**
     * Atomically create an order and deduct product stock (Customer Checkout).
     */
    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = $this->checkoutService->execute($request->validated());

        return ApiResponse::success(
            new OrderResource($order),
            'Pesanan berhasil dibuat.',
            201,
        );
    }

    /**
     * Show full order details including immutable line item snapshots.
     */
    public function show(Order $order): JsonResponse
    {
        $order->load('items');

        return ApiResponse::success(
            new OrderResource($order),
            'Detail pesanan berhasil diambil.',
        );
    }
}
