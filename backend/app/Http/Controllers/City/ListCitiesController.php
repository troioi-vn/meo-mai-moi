<?php

namespace App\Http\Controllers\City;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class ListCitiesController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $request->validate([
            'country' => 'required|string|size:2',
            'search' => 'nullable|string|max:50',
        ]);

        $query = City::forCountry($request->country)
            ->visibleTo($request->user());

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('name', 'ilike', "%{$search}%");
        }

        $cities = $query->orderBy('name')->get();

        return $this->sendSuccess($cities);
    }
}

