<?php

namespace App\Domain\Scheduling;

use Carbon\CarbonImmutable as Date;

final class Recurrence
{
    public function slots(array $rule, string $through): array
    {
        $first = Date::parse($rule['first_date'])->startOfDay();
        $until = Date::parse($through)->startOfDay();
        if (! empty($rule['end_date'])) {
            $until = $until->min(Date::parse($rule['end_date']));
        }
        $result = [];
        $slot = 0;
        for ($n = 0; $n < 20000; $n++) {
            $frequency = $rule['frequency'];
            $dates = match ($frequency) {
                'once' => [$first], 'weekly' => [$first->addDays($n * 7)], 'biweekly' => [$first->addDays($n * 14)],
                'monthly' => [$this->monthDay($first->startOfMonth()->addMonths($n), (int) $first->day)],
                'yearly' => [$this->monthDay($first->startOfMonth()->addYears($n), (int) $first->day)],
                'twice_monthly' => [$this->monthDay($first->startOfMonth()->addMonths($n), min((int) $rule['day_one'], (int) $rule['day_two'])), $this->monthDay($first->startOfMonth()->addMonths($n), max((int) $rule['day_one'], (int) $rule['day_two']))],
                default => throw new \InvalidArgumentException('Unsupported recurrence'),
            };
            if ($dates[0] > $until && ($dates[1] ?? $dates[0]) > $until) {
                break;
            }
            foreach ($dates as $index => $date) {
                if ($date < $first) {
                    continue;
                }
                if ($date <= $until) {
                    $result[] = ['key' => $n.':'.$index, 'slot' => $slot, 'date' => $date->toDateString()];
                }
                $slot++;
            }
            if ($frequency === 'once') {
                break;
            }
        }

        return $result;
    }

    private function monthDay(Date $month, int $day): Date
    {
        return $month->day(min($day, $month->daysInMonth));
    }
}
