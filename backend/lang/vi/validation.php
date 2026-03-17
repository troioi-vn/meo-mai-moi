<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Custom Validation Messages
    |--------------------------------------------------------------------------
    |
    | These are custom validation messages used across the application.
    | Laravel's built-in validation messages are in the framework.
    |
    */

    'custom' => [
        'email' => [
            'required' => 'Email là bắt buộc.',
            'email' => 'Vui lòng nhập địa chỉ email hợp lệ.',
            'unique' => 'Email này đã được đăng ký.',
            'exists' => 'Chúng tôi không tìm thấy tài khoản với email này.',
        ],

        'password' => [
            'required' => 'Mật khẩu là bắt buộc.',
            'min' => 'Mật khẩu phải có ít nhất :min ký tự.',
            'confirmed' => 'Xác nhận mật khẩu không khớp.',
            'current_password' => 'Mật khẩu hiện tại không chính xác.',
        ],

        'current_password' => [
            'required' => 'Vui lòng nhập mật khẩu để xác nhận xóa tài khoản.',
        ],

        'name' => [
            'required' => 'Tên là bắt buộc.',
            'min' => 'Tên phải có ít nhất :min ký tự.',
            'max' => 'Tên không được vượt quá :max ký tự.',
        ],

        'phone_number' => [
            'regex' => 'Số điện thoại chứa các ký tự không hợp lệ.',
        ],
    ],

    'password_messages' => [
        'required' => 'Mật khẩu là bắt buộc.',
        'min' => 'Mật khẩu phải có ít nhất :min ký tự.',
        'confirmed' => 'Xác nhận mật khẩu không khớp.',
        'current_incorrect' => 'Mật khẩu hiện tại không chính xác.',
        'required_for_deletion' => 'Vui lòng nhập mật khẩu để xác nhận xóa tài khoản.',
        'no_password_set' => 'Tài khoản này chưa được thiết lập mật khẩu. Vui lòng sử dụng tùy chọn khôi phục mật khẩu để thiết lập.',
    ],
];
