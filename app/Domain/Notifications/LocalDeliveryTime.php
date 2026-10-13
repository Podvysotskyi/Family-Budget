<?php

namespace App\Domain\Notifications;

use Carbon\CarbonImmutable;
use DateTimeImmutable;
use DateTimeZone;

final class LocalDeliveryTime
{
    public function resolve(string $date, string $time, string $timezone): CarbonImmutable
    {
        $wall = (new DateTimeImmutable("$date $time", new DateTimeZone('UTC')))->getTimestamp();
        $zone = new DateTimeZone($timezone);
        $transitions = $zone->getTransitions($wall - 172800, $wall + 172800) ?: [];
        $matches = [];
        $previousOffset = null;
        foreach ($transitions as $transition) {
            $offset = $transition['offset'];
            $candidate = $wall - $offset;
            if ((new DateTimeImmutable('@'.$candidate))->setTimezone($zone)->format('Y-m-d H:i') === "$date $time") {
                $matches[] = $candidate;
            }
            if ($previousOffset !== null && $offset > $previousOffset && $wall >= $transition['ts'] + $previousOffset && $wall < $transition['ts'] + $offset) {
                return CarbonImmutable::createFromTimestampUTC($transition['ts']);
            }
            $previousOffset = $offset;
        }
        if ($matches) {
            return CarbonImmutable::createFromTimestampUTC(min($matches));
        }

        return CarbonImmutable::instance(new DateTimeImmutable("$date $time", $zone))->utc();
    }
}
