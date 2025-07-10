<?php

namespace App\Http\Controllers;

use App\Models\Cat;
use App\Models\CatComment;
use Illuminate\Http\Request;

class CatCommentController extends Controller
{
    public function index(Cat $cat)
    {
        return response()->json($cat->comments()->with('user')->latest()->get());
    }

    public function store(Request $request, Cat $cat)
    {
        $request->validate([
            'comment' => 'required|string|max:255',
        ]);

        $comment = $cat->comments()->create([
            'user_id' => auth()->id(),
            'comment' => $request->comment,
        ]);

        return response()->json($comment->load('user'), 201);
    }
}
