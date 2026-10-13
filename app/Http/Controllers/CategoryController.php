<?php

namespace App\Http\Controllers;

use App\Domain\Budget\Budget;
use App\Domain\History\Audit;
use App\Models\Category;
use App\Models\Occurrence;
use App\Models\Series;
use App\Models\TargetOverride;
use App\Models\TargetPeriod;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CategoryController extends FinanceController
{
    public function index()
    {
        $transactions = Transaction::selectRaw('category_id, count(*) as count')->groupBy('category_id')->pluck('count', 'category_id');
        $schedules = Series::selectRaw('category_id, count(*) as count')->groupBy('category_id')->pluck('count', 'category_id');
        $categories = Category::orderBy('name')->get();

        return Inertia::render('Finance/Index', ['section' => 'categories', 'records' => $categories->map(fn ($c) => [...$c->toArray(), 'transaction_count' => (int) ($transactions[$c->id] ?? 0), 'schedule_count' => (int) ($schedules[$c->id] ?? 0), 'child_count' => $categories->where('parent_id', $c->id)->count(), 'target_cents' => app(Budget::class)->target($c->id, now('UTC')->format('Y-m'))]), 'catalog' => $this->catalog()]);
    }

    public function store(Request $r)
    {
        return $this->change($r, function () use ($r) {
            $v = $this->values($r);
            $c = Category::create($v);
            Audit::record($c, 'created');

            return $c;
        }, 'Category created.');
    }

    private function values(Request $r, ?Category $existing = null): array
    {
        $v = $r->validate(['name' => 'required|string|max:80', 'kind' => 'required|in:expense,income', 'parent_id' => 'nullable|uuid']);
        $v['name_normalized'] = mb_strtolower(trim($v['name']));
        if ($existing) {
            $v['kind'] = $existing->kind;
        }if (! empty($v['parent_id'])) {
            $p = Category::findOrFail($v['parent_id']);
            if ($p->parent_id || $p->kind !== $v['kind'] || $p->system_key === 'transfers' || $p->id === $existing?->id) {
                throw ValidationException::withMessages(['parent_id' => 'Choose a top-level category of the same type.']);
            }if ($existing && Category::where('parent_id', $existing->id)->exists()) {
                throw ValidationException::withMessages(['parent_id' => 'A category with children cannot become a subcategory.']);
            }
        }if (Category::where('name_normalized', $v['name_normalized'])->where('parent_id', $v['parent_id'] ?? null)->when($existing, fn ($q) => $q->where('id', '!=', $existing->id))->exists()) {
            throw ValidationException::withMessages(['name' => 'A category with this name already exists here.']);
        }

        return $v;
    }

    public function update(Request $r, string $id)
    {
        return $this->change($r, function () use ($r, $id) {
            $c = Category::findOrFail($id);
            $this->version($r, $c);
            abort_if($c->system_key, 422, 'Built-in categories cannot be renamed or moved.');
            $v = $this->values($r, $c);
            if (! $c->parent_id && ! empty($v['parent_id'])) {
                $month = now('UTC')->format('Y-m').'-01';
                foreach (TargetPeriod::where('category_id', $c->id)->where(fn ($q) => $q->whereNull('end_month')->orWhere('end_month', '>', $month))->get() as $period) {
                    $beforeTarget = $period->toArray();
                    if ($period->start_month >= $month) {
                        $period->delete();
                    } else {
                        $period->update(['end_month' => $month]);
                    }
                    Audit::record($period, 'category_nested_target_removed', $beforeTarget);
                }
                foreach (TargetOverride::where('category_id', $c->id)->where('month', '>=', $month)->get() as $override) {
                    $beforeTarget = $override->toArray();
                    $override->delete();
                    Audit::record($override, 'category_nested_target_removed', $beforeTarget);
                }
            }
            $before = $c->toArray();
            $c->update([...$v, 'lock_version' => $c->lock_version + 1]);
            Audit::record($c, 'edited', $before);

            return $c;
        });
    }

    public function destroy(Request $r, string $id)
    {
        return $this->change($r, function () use ($r, $id) {
            $c = Category::findOrFail($id);
            $this->version($r, $c);
            abort_if($c->system_key, 422, 'Built-in categories cannot be deleted.');
            $v = $r->validate(['replacement_id' => 'required|uuid']);
            $ids = Category::where('id', $id)->orWhere('parent_id', $id)->pluck('id')->all();
            $replacement = null;
            if (! empty($v['replacement_id'])) {
                $replacement = Category::findOrFail($v['replacement_id']);
                if ($replacement->kind !== $c->kind || in_array($replacement->id, $ids)) {
                    throw ValidationException::withMessages(['replacement_id' => 'Choose a replacement of the same type outside this category.']);
                }
            }foreach ([Transaction::class, Series::class, Occurrence::class] as $model) {
                foreach ($model::withTrashed()->whereIn('category_id', $ids)->get() as $record) {
                    $before = $record->toArray();
                    $record->update(['category_id' => $replacement?->id]);
                    Audit::record($record, 'category_replaced', $before);
                }
            }$month = now('UTC')->format('Y-m').'-01';
            foreach ($ids as $categoryId) {
                foreach (TargetPeriod::where('category_id', $categoryId)->where(fn ($q) => $q->whereNull('end_month')->orWhere('end_month', '>', $month))->get() as $p) {
                    if ($p->start_month >= $month) {
                        $p->delete();
                    } else {
                        $p->update(['end_month' => $month]);
                    }
                }TargetOverride::where('category_id', $categoryId)->where('month', '>=', $month)->delete();
            }$all = Category::whereIn('id', $ids)->orderByRaw('parent_id IS NULL')->get();
            foreach ($all as $removed) {
                $before = $removed->toArray();
                $removed->update(['replacement_id' => $replacement?->id]);
                $removed->delete();
                Audit::record($removed, 'deleted_with_replacement', $before);
            }

            return $c;
        }, 'Category removed. Historical spending now uses its replacement.');
    }
}
