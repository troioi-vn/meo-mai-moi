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
        'current_incorrect' => 'Mật khẩu hiện tại không chính xác.',
        'required_for_deletion' => 'Vui lòng nhập mật khẩu để xác nhận xóa tài khoản.',
        'no_password_set' => 'Tài khoản này chưa được thiết lập mật khẩu. Vui lòng sử dụng tùy chọn khôi phục mật khẩu để thiết lập.',
    ],

    'name' => [
        'required' => 'Tên là bắt buộc.',
        'min' => 'Tên phải có ít nhất :min ký tự.',
        'max' => 'Tên không được vượt quá :max ký tự.',
    ],

    'pet' => [
        'name_required' => 'Tên thú cưng là bắt buộc.',
        'species_required' => 'Chủng loại là bắt buộc.',
        'species_invalid' => 'Chủng loại đã chọn không hợp lệ.',
        'birth_date_invalid' => 'Ngày sinh không hợp lệ.',
        'birth_date_future' => 'Ngày sinh không thể ở tương lai.',
        'weight_invalid' => 'Cân nặng phải là một số dương.',
    ],

    'medical' => [
        'record_type_required' => 'Loại hồ sơ là bắt buộc.',
        'record_type_invalid' => 'Loại hồ sơ không hợp lệ.',
        'title_required' => 'Tiêu đề là bắt buộc.',
        'date_required' => 'Ngày tháng là bắt buộc.',
        'date_future' => 'Ngày tháng không thể ở tương lai.',
    ],

    'helper' => [
        'bio_required' => 'Thông tin giới thiệu là bắt buộc.',
        'bio_max' => 'Thông tin giới thiệu không được vượt quá :max ký tự.',
        'country_required' => 'Quốc gia là bắt buộc.',
        'cities_required' => 'Yêu cầu ít nhất một thành phố.',
        'cities_invalid' => 'Một hoặc nhiều thành phố đã chọn không hợp lệ.',
    ],

    'invitation' => [
        'email_required' => 'Email người nhận là bắt buộc.',
        'relationship_type_required' => 'Loại mối quan hệ là bắt buộc.',
        'relationship_type_invalid' => 'Loại mối quan hệ không hợp lệ.',
    ],

    'locale' => [
        'invalid' => 'Ngôn ngữ đã chọn không được hỗ trợ.',
    ],

    'notification' => [
        'type_required' => 'Loại thông báo là bắt buộc.',
        'type_invalid' => 'Loại thông báo đã chọn không hợp lệ.',
        'email_enabled_required' => 'Tùy chọn nhận qua email là bắt buộc.',
        'email_enabled_boolean' => 'Tùy chọn nhận qua email phải là true hoặc false.',
        'in_app_enabled_required' => 'Tùy chọn nhận trong ứng dụng là bắt buộc.',
        'in_app_enabled_boolean' => 'Tùy chọn nhận trong ứng dụng phải là true hoặc false.',
    ],

    'file' => [
        'required' => 'Vui lòng chọn một tệp.',
        'image' => 'Tệp phải là một hình ảnh.',
        'max' => 'Kích thước tệp không được vượt quá :max kilobytes.',
        'mimes' => 'Tệp phải thuộc loại: :values.',
    ],
];
