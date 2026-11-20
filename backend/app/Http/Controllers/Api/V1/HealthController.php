<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

final class HealthController extends Controller
{
    /**
     * Check application and database connectivity.
     */
    public function __invoke(): JsonResponse
    {
        try {
            DB::select('SELECT 1');

            return ApiResponse::success([
                'status' => 'ok',
                'database' => 'connected',
                'driver' => DB::getDriverName(),
                'timestamp' => now()->toIso8601String(),
            ], 'Service healthy.');
        } catch (\Throwable) {
            return ApiResponse::error('Database connection failed.', 503);
        }
    }
}
