<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Laravel\Sanctum\Sanctum;

Route::get('/', function () {
    return view('welcome');
});