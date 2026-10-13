<?php

namespace App\Domain\Shared;

use Illuminate\Validation\ValidationException;

final class Money
{
    public static function parse(string|int|null $value, bool $signed = false): int
    {
        $value = (string) $value;
        if (! preg_match($signed ? '/^-?\\d{1,9}(?:\\.\\d{1,2})?$/' : '/^\\d{1,9}(?:\\.\\d{1,2})?$/', $value)) {
            throw ValidationException::withMessages(['amount' => 'Enter a valid USD amount with at most two decimal places.']);
        }
        $negative = str_starts_with($value, '-');
        $parts = explode('.', ltrim($value, '-'));
        $cents = (int) $parts[0] * 100 + (int) str_pad($parts[1] ?? '', 2, '0');

        return $negative ? -$cents : $cents;
    }

    public static function display(int|string|null $cents): string
    {
        return $cents === null ? '—' : ((int) $cents < 0 ? '−' : '').'$'.number_format(abs((int) $cents) / 100, 2);
    }
}
