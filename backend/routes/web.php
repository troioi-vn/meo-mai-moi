<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Laravel\Sanctum\Sanctum;

Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');