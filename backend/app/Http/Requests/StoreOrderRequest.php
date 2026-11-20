<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'min:2', 'max:120'],
            'customer_email' => ['nullable', 'email', 'max:150'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'min:1', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'customer_name.required' => 'Nama pembeli wajib diisi.',
            'customer_name.min' => 'Nama pembeli minimal 2 karakter.',
            'customer_name.max' => 'Nama pembeli maksimal 120 karakter.',
            'customer_email.email' => 'Format email pembeli tidak valid.',
            'customer_email.max' => 'Email pembeli maksimal 150 karakter.',
            'notes.max' => 'Catatan pesanan maksimal 500 karakter.',
            'items.required' => 'Daftar produk pesanan tidak boleh kosong.',
            'items.array' => 'Format daftar produk pesanan tidak valid.',
            'items.min' => 'Minimal harus terdapat 1 produk dalam pesanan.',
            'items.*.product_id.required' => 'ID produk wajib diisi.',
            'items.*.product_id.integer' => 'ID produk harus berupa angka bulat.',
            'items.*.product_id.min' => 'ID produk tidak valid.',
            'items.*.product_id.distinct' => 'Produk yang sama tidak boleh dikirim lebih dari satu kali dalam satu pesanan.',
            'items.*.quantity.required' => 'Jumlah produk wajib diisi.',
            'items.*.quantity.integer' => 'Jumlah produk harus berupa angka bulat.',
            'items.*.quantity.min' => 'Jumlah produk minimal 1.',
        ];
    }
}
