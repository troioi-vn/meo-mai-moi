<?php

declare(strict_types=1);

return [
    'enums' => [
        'placement_request_type' => [
            'foster_paid' => 'Nhận nuôi tạm thời (có phí)',
            'foster_free' => 'Nhận nuôi tạm thời (miễn phí)',
            'permanent' => 'Nhận nuôi lâu dài',
            'pet_sitting' => 'Trông giữ thú cưng',
        ],
        'placement_request_status' => [
            'open' => 'Mở',
            'fulfilled' => 'Đã hoàn thành',
            'pending_transfer' => 'Đang chờ chuyển giao',
            'active' => 'Đang hoạt động',
            'finalized' => 'Đã kết thúc',
            'expired' => 'Hết hạn',
            'cancelled' => 'Đã hủy',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | General Messages
    |--------------------------------------------------------------------------
    */
    'success' => 'Thao tác hoàn tất thành công.',
    'error' => 'Đã xảy ra lỗi.',
    'not_found' => 'Không tìm thấy tài nguyên.',
    'unauthorized' => 'Bạn không có quyền thực hiện hành động này.',
    'forbidden' => 'Truy cập bị từ chối.',
    'unauthenticated' => 'Chưa xác thực.',
    'image_preview' => '📷 Hình ảnh',

    /*
    |--------------------------------------------------------------------------
    | Auth Messages
    |--------------------------------------------------------------------------
    */
    'auth' => [
        'login_success' => 'Đăng nhập thành công.',
        'logout_success' => 'Đăng xuất thành công.',
        'register_success' => 'Đăng ký thành công.',
        'password_updated' => 'Mật khẩu đã được cập nhật thành công.',
        'password_reset_sent' => 'Liên kết khôi phục mật khẩu đã được gửi.',
        'password_reset_success' => 'Khôi phục mật khẩu thành công.',
        'email_verified' => 'Xác minh email thành công.',
        'verification_sent' => 'Email xác minh đã được gửi.',
        'email_already_verified' => 'Địa chỉ email đã được xác minh.',
        'invalid_verification_link' => 'Liên kết xác minh không hợp lệ.',
        'expired_verification_link' => 'Liên kết xác minh không hợp lệ hoặc đã hết hạn.',
        'invalid_credentials' => 'Thông tin đăng nhập không chính xác.',
        'account_banned' => 'Tài khoản của bạn đã bị khóa.',
        'email_not_verified' => 'Vui lòng xác minh địa chỉ email của bạn.',
        'two_factor_required' => 'Yêu cầu xác thực hai yếu tố.',
        'two_factor_invalid' => 'Mã xác thực hai yếu tố không hợp lệ.',
        'account_deleted' => 'Tài khoản của bạn đã bị xóa.',
        'password_incorrect' => 'Mật khẩu không chính xác.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Pet Messages
    |--------------------------------------------------------------------------
    */
    'pets' => [
        'created' => 'Thêm thú cưng thành công.',
        'updated' => 'Cập nhật thông tin thú cưng thành công.',
        'deleted' => 'Xóa thú cưng thành công.',
        'not_found' => 'Không tìm thấy thú cưng.',
        'archived' => 'Lưu trữ thú cưng thành công.',
        'unarchived' => 'Bỏ lưu trữ thú cưng thành công.',
        'photo_uploaded' => 'Tải ảnh lên thành công.',
        'photo_deleted' => 'Xóa ảnh thành công.',
        'photo_not_found' => 'Không tìm thấy ảnh.',
        'microchip_created' => 'Tạo hồ sơ vi mạch thành công.',
        'microchip_updated' => 'Cập nhật hồ sơ vi mạch thành công.',
        'microchip_deleted' => 'Xóa hồ sơ vi mạch thành công.',
        'photo_set_primary' => 'Thiết lập ảnh chính thành công.',
        'relationship_added' => 'Thêm mối quan hệ thành công.',
        'relationship_removed' => 'Xóa mối quan hệ thành công.',
        'cannot_remove_owner' => 'Không thể xóa mối quan hệ chủ sở hữu.',
        'already_has_relationship' => 'Người dùng đã có mối quan hệ này với thú cưng.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Medical Records Messages
    |--------------------------------------------------------------------------
    */
    'medical' => [
        'created' => 'Tạo hồ sơ y tế thành công.',
        'updated' => 'Cập nhật hồ sơ y tế thành công.',
        'deleted' => 'Xóa hồ sơ y tế thành công.',
        'not_found' => 'Không tìm thấy hồ sơ y tế.',
    ],
    'habits' => [
        'created' => 'Tạo thói quen thành công.',
        'updated' => 'Cập nhật thói quen thành công.',
        'deleted' => 'Xóa thói quen thành công.',
        'archived' => 'Lưu trữ thói quen thành công.',
        'unarchived' => 'Khôi phục thói quen thành công.',
        'entries_saved' => 'Đã lưu bản ghi thói quen.',
        'must_own_all_selected_pets' => 'Bạn phải là chủ hiện tại của tất cả thú cưng đã chọn.',
        'integer_scale_requires_bounds' => 'Thói quen dạng số cần giá trị nhỏ nhất và lớn nhất.',
        'yes_no_cannot_define_bounds' => 'Thói quen có/không không thể dùng giới hạn số.',
        'reminder_time_required' => 'Cần có giờ nhắc khi bật nhắc nhở.',
        'only_creator_can_change_pet_list' => 'Chỉ người tạo thói quen mới có thể thay đổi danh sách thú cưng.',
        'pet_not_accessible' => 'Thú cưng đó không khả dụng trong thói quen này.',
        'invalid_yes_no_value' => 'Thói quen có/không chỉ chấp nhận giá trị 0 hoặc 1.',
        'invalid_scale_value' => 'Giá trị phải nằm trong khoảng :min đến :max.',
        'default_name' => 'thói quen',
        'open_habit' => 'Mở thói quen',
    ],

    /*
    |--------------------------------------------------------------------------
    | Helper Profile Messages
    |--------------------------------------------------------------------------
    */
    'helper' => [
        'created' => 'Tạo hồ sơ người hỗ trợ thành công.',
        'updated' => 'Cập nhật hồ sơ người hỗ trợ thành công.',
        'deleted' => 'Xóa hồ sơ người hỗ trợ thành công.',
        'not_found' => 'Không tìm thấy hồ sơ người hỗ trợ.',
        'archived' => 'Lưu trữ hồ sơ người hỗ trợ thành công.',
        'unarchived' => 'Bỏ lưu trữ hồ sơ người hỗ trợ thành công.',
        'cannot_archive_with_requests' => 'Không thể lưu trữ hồ sơ khi có các yêu cầu gửi gắm liên quan.',
        'cannot_delete_with_requests' => 'Không thể xóa hồ sơ khi có các yêu cầu gửi gắm liên quan.',
        'only_archived_can_be_restored' => 'Chỉ có hồ sơ đã lưu trữ mới có thể được khôi phục.',
        'cities_not_found' => 'Một hoặc nhiều thành phố không tồn tại.',
        'city_country_mismatch' => 'Thành phố :name không thuộc quốc gia đã chọn.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Thông báo dung lượng
    |--------------------------------------------------------------------------
    */
    'storage' => [
        'limit_exceeded' => 'Đã đạt giới hạn dung lượng. Nâng cấp Premium để mở khóa 5 GB.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Invitation Messages
    |--------------------------------------------------------------------------
    */
    'invitation' => [
        'created' => 'Tạo lời mời thành công.',
        'sent' => 'Gửi lời mời thành công.',
        'accepted' => 'Chấp nhận lời mời thành công.',
        'declined' => 'Từ chối lời mời thành công.',
        'cancelled' => 'Hủy lời mời thành công.',
        'not_found' => 'Không tìm thấy lời mời.',
        'expired' => 'Lời mời này đã hết hạn.',
        'already_used' => 'Lời mời này đã được sử dụng.',
        'invalid' => 'Lời mời không hợp lệ.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Waitlist Messages
    |--------------------------------------------------------------------------
    */
    'waitlist' => [
        'joined' => 'Bạn đã tham gia danh sách chờ.',
        'already_joined' => 'Bạn đã có tên trong danh sách chờ.',
        'email_exists' => 'Email này đã có trong danh sách chờ.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Notification Messages
    |--------------------------------------------------------------------------
    */
    'notifications' => [
        'preferences_updated' => 'Cập nhật tùy chọn thông báo thành công.',
        'marked_read' => 'Đã đánh dấu thông báo là đã đọc.',
        'all_marked_read' => 'Đã đánh dấu tất cả thông báo là đã đọc.',
        'groups' => [
            'placement_owner' => 'Yêu cầu gửi gắm của bạn',
            'placement_helper' => 'Phản hồi gửi gắm của bạn',
            'pet_reminders' => 'Nhắc nhở thú cưng',
            'account' => 'Tài khoản',
            'messaging' => 'Tin nhắn',
            'other' => 'Khác',
        ],
        'types' => [
            'placement_request_response' => [
                'label' => 'Phản hồi mới cho yêu cầu của bạn',
                'description' => 'Khi có người phản hồi yêu cầu gửi gắm của bạn',
            ],
            'helper_response_accepted' => [
                'label' => 'Phản hồi của bạn đã được chấp nhận',
                'description' => 'Khi chủ thú cưng chấp nhận phản hồi của bạn',
            ],
            'helper_response_rejected' => [
                'label' => 'Phản hồi của bạn đã bị từ chối',
                'description' => 'Khi chủ thú cưng từ chối phản hồi của bạn',
            ],
            'helper_response_canceled' => [
                'label' => 'Người hỗ trợ đã rút phản hồi',
                'description' => 'Khi người hỗ trợ rút lại phản hồi của họ',
            ],
            'transfer_confirmed' => [
                'label' => 'Đã xác nhận chuyển giao thú cưng',
                'description' => 'Khi người hỗ trợ xác nhận đã nhận thú cưng',
            ],
            'placement_ended' => [
                'label' => 'Giai đoạn gửi gắm đã kết thúc',
                'description' => 'Khi giai đoạn gửi gắm bạn tham gia đã kết thúc',
            ],
            'vaccination_reminder' => [
                'label' => 'Nhắc nhở tiêm chủng',
                'description' => 'Nhắc nhở khi đến hạn tiêm chủng',
            ],
            'pet_birthday' => [
                'label' => 'Sinh nhật thú cưng',
                'description' => 'Thông báo vào ngày sinh nhật của thú cưng',
            ],
            'habit_reminder' => [
                'label' => 'Nhắc nhở thói quen',
                'description' => 'Nhắc bạn ghi lại thói quen',
            ],
            'email_verification' => [
                'label' => 'Xác minh email',
                'description' => 'Email xác minh địa chỉ email của bạn',
            ],
            'system_announcement' => [
                'label' => 'Thông báo hệ thống',
                'description' => 'Các cập nhật và thông báo quan trọng từ nền tảng',
            ],
            'new_message' => [
                'label' => 'Tin nhắn mới',
                'description' => 'Khi bạn nhận được tin nhắn mới',
            ],
            'chat_digest' => [
                'label' => 'Tóm tắt tin nhắn',
                'description' => 'Tóm tắt định kỳ các tin nhắn chưa đọc',
            ],
            'placement_request' => [
                'label' => 'Yêu cầu gửi gắm',
            ],
            'transfer_accepted' => [
                'label' => 'Đã chấp nhận bàn giao',
            ],
        ],
        'actions' => [
            'city_unapprove' => [
                'label' => 'Bỏ phê duyệt',
                'confirm_title' => 'Bỏ phê duyệt thành phố này?',
                'confirm_description' => 'Điều này sẽ làm cho thành phố không hiển thị với người dùng cho đến khi được phê duyệt lại.',
                'disabled_not_found' => 'Không tìm thấy thành phố',
                'disabled_already' => 'Đã bỏ phê duyệt',
                'success' => 'Đã bỏ phê duyệt thành phố',
                'already_unapproved' => 'Thành phố đã được bỏ phê duyệt rồi',
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Chat Messages
    |--------------------------------------------------------------------------
    */
    'chat' => [
        'created' => 'Tạo cuộc trò chuyện thành công.',
        'message_sent' => 'Đã gửi tin nhắn.',
        'not_found' => 'Không tìm thấy cuộc trò chuyện.',
        'cannot_message_self' => 'Bạn không thể gửi tin nhắn cho chính mình.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Locale Messages
    |--------------------------------------------------------------------------
    */
    'locale' => [
        'updated' => 'Đã cập nhật tùy chọn ngôn ngữ.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Placement Request Messages
    |--------------------------------------------------------------------------
    */
    'placement' => [
        'not_found' => 'Không tìm thấy yêu cầu gửi gắm.',
        'not_active' => 'Yêu cầu gửi gắm này không còn hoạt động.',
        'unauthorized_create' => 'Bạn không có quyền tạo yêu cầu gửi gắm cho thú cưng này.',
        'already_exists' => 'Đã tồn tại một yêu cầu gửi gắm cùng loại đang hoạt động cho thú cưng này.',
        'only_owner_can_finalize' => 'Chỉ chủ sở hữu thú cưng mới có thể hoàn tất yêu cầu gửi gắm này.',
        'only_active_can_finalize' => 'Chỉ có thể hoàn tất các yêu cầu gửi gắm đang hoạt động.',
        'only_temporary_can_finalize' => 'Chỉ có thể hoàn tất gửi gắm tạm thời theo cách này.',
        'cannot_respond' => 'Bạn không thể phản hồi yêu cầu gửi gắm này vào lúc này.',
        'already_responded' => 'Bạn đã phản hồi yêu cầu gửi gắm này rồi.',
        'cannot_self_respond' => 'Bạn không thể phản hồi yêu cầu gửi gắm của chính mình.',
        'response_cannot_accept' => 'Không thể chấp nhận phản hồi này ở trạng thái hiện tại.',
        'response_cannot_cancel' => 'Không thể hủy phản hồi này ở trạng thái hiện tại.',
        'response_cannot_reject' => 'Không thể từ chối phản hồi này ở trạng thái hiện tại.',
        'unauthorized_view_responses' => 'Bạn không có quyền xem các phản hồi cho yêu cầu gửi gắm này.',
        'terms_not_found' => 'Không tìm thấy điều khoản gửi gắm.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Transfer Request Messages
    |--------------------------------------------------------------------------
    */
    'transfer' => [
        'only_pending_reject' => 'Chỉ có thể từ chối các yêu cầu đang chờ xử lý.',
        'only_pending_cancel' => 'Chỉ có thể hủy các yêu cầu đang chờ xử lý.',
        'only_pending_confirm' => 'Chỉ có thể xác nhận các yêu cầu chuyển nhượng đang chờ xử lý.',
    ],

    /*
    |--------------------------------------------------------------------------
    | City Messages
    |--------------------------------------------------------------------------
    */
    'city' => [
        'not_found' => 'Không tìm thấy thành phố.',
        'country_mismatch' => 'Thành phố đã chọn không thuộc quốc gia đã chỉ định.',
        'limit_reached' => 'Bạn đã đạt giới hạn 10 thành phố trong vòng 24 giờ. Vui lòng thử lại sau.',
        'already_exists' => 'Thành phố với tên này đã tồn tại ở quốc gia này.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Category Messages
    |--------------------------------------------------------------------------
    */
    'category' => [
        'already_exists' => 'Danh mục với tên này đã tồn tại cho loại thú cưng này.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Message/Messaging Messages
    |--------------------------------------------------------------------------
    */
    'message' => [
        'unauthorized_view' => 'Bạn không có quyền xem tin nhắn này.',
        'unauthorized_mark_read' => 'Bạn không có quyền đánh dấu tin nhắn này là đã đọc.',
        'unauthorized_delete' => 'Bạn không có quyền xóa tin nhắn này.',
        'group_not_implemented' => 'Trò chuyện nhóm chưa được triển khai.',
        'only_owner_can_message' => 'Chỉ chủ sở hữu yêu cầu gửi gắm mới có thể nhắn tin cho người hỗ trợ trong yêu cầu này.',
        'recipient_must_be_helper' => 'Người nhận phải là người hỗ trợ đã phản hồi yêu cầu gửi gắm.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Email Messages
    |--------------------------------------------------------------------------
    */
    'email' => [
        'verification_unavailable' => 'Hiện tại chúng tôi không thể gửi email xác minh. Hy vọng quản trị viên đang khắc phục vấn đề này và bạn sẽ sớm nhận được nó.',
        'send_failed' => 'Hiện tại chúng tôi không thể gửi email. Vui lòng thử lại sau.',
    ],

    /*
    |--------------------------------------------------------------------------
    | User Profile Messages
    |--------------------------------------------------------------------------
    */
    'profile' => [
        'no_avatar' => 'Không có ảnh đại diện để xóa.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Admin Messages
    |--------------------------------------------------------------------------
    */
    'admin' => [
        'cannot_ban_admin' => 'Không thể khóa tài khoản quản trị viên.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Pet Additional Messages
    |--------------------------------------------------------------------------
    */
    'pets_extra' => [
        'not_public' => 'Hồ sơ thú cưng này không được công khai.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Impersonation Messages
    |--------------------------------------------------------------------------
    */
    'impersonation' => [
        'not_impersonating' => 'Không trong chế độ giả danh.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Unsubscribe Messages
    |--------------------------------------------------------------------------
    */
    'unsubscribe' => [
        'invalid_request' => 'Yêu cầu hủy đăng ký không hợp lệ. Liên kết có thể đã hết hạn hoặc không chính xác.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Tin nhắn Telegram Bot
    |--------------------------------------------------------------------------
    */
    'telegram' => [
        'choose_language' => '🌐 Choose your language / Выберите язык / Оберіть мову / Chọn ngôn ngữ:',
        'welcome_new' => "Chào mừng bạn đến với :app_name! 👋\n\nNếu bạn đã có tài khoản, bạn có thể liên kết Telegram từ Cài đặt → Tài khoản trong ứng dụng.\n\nNếu chưa, hãy nhấn nút bên dưới để tạo tài khoản mới.",
        'create_account_button' => 'Tạo tài khoản mới',
        'open_app_button' => 'Mở ứng dụng',
        'already_linked' => 'Tài khoản Telegram của bạn đã được liên kết với :app_name! Nhấn nút bên dưới để mở ứng dụng. Hoặc dùng <a href=":web_app_url">web-app</a>.',
        'account_created' => 'Tài khoản của bạn đã được tạo và liên kết với Telegram! Nhấn nút bên dưới để mở :app_name.',
        'account_found' => 'Bạn đã có tài khoản! Telegram của bạn đã được liên kết.',
        'linked' => 'Đã liên kết Telegram! Bạn có thể nhận thông báo từ :app_name tại đây và đăng nhập qua bot này.',
        'invite_only' => 'Hiện tại chỉ đăng ký được qua lời mời. Nếu bạn đã có tài khoản, hãy liên kết từ Cài đặt → Tài khoản trong ứng dụng.',
        'invite_only_short' => 'Chỉ đăng ký qua lời mời.',
        'identify_error' => 'Không thể xác định tài khoản Telegram của bạn. Vui lòng thử lại.',
        'invalid_token' => "Liên kết này đã hết hạn hoặc không hợp lệ. Vui lòng vào Cài đặt → Tài khoản và nhấn \"Kết nối Telegram\" lần nữa.\n\n<a href=\":url/settings/account\">Mở cài đặt tài khoản</a>",
        'no_token' => "Vui lòng mở Cài đặt → Tài khoản và nhấn \"Kết nối Telegram\" trong tài khoản :app_name của bạn.\n\n<a href=\":url/settings/account\">Mở cài đặt tài khoản</a>",
    ],

    /*
    |--------------------------------------------------------------------------
    | Email Messages
    |--------------------------------------------------------------------------
    */
    'emails' => [
        'app_description' => 'Meo Mai Moi là một nền tảng quản lý chăm sóc thú cưng toàn diện.',
        'subjects' => [
            'placement_request_response' => 'Có phản hồi mới cho yêu cầu của bạn dành cho :pet',
            'helper_response_accepted' => 'Tin vui! Phản hồi của bạn cho :pet đã được chấp nhận',
            'placement_ended' => 'Việc chăm sóc cho :pet đã kết thúc',
            'new_message' => 'Tin nhắn mới từ :sender',
            'vaccination_reminder' => 'Nhắc nhở: :pet cần tiêm phòng :vaccine :due',
            'pet_birthday' => '🎂 Chúc mừng sinh nhật :pet! :age',
            'habit_reminder' => 'Nhắc nhở: hãy ghi lại :habit hôm nay',
            'helper_response_canceled' => 'Người giúp đỡ đã rút lại phản hồi cho :pet',
            'helper_response_rejected' => 'Cập nhật về phản hồi của bạn cho :pet',
            'transfer_confirmed' => 'Đã xác nhận bàn giao cho :pet',
            'email_verification' => 'Xác minh Địa chỉ Email - :app',
            'password_reset' => 'Đặt lại Mật khẩu - :app',
            'invitation' => 'Bạn được mời! - :app',
            'waitlist' => 'Bạn đã có tên trong danh sách chờ! - :app',
        ],
        'common' => [
            'hello' => 'Xin chào :name,',
            'hello_simple' => 'Xin chào!',
            'hi' => 'Chào :name,',
            'thanks' => 'Cảm ơn,',
            'team' => 'Đội ngũ :app',
            'best_regards' => 'Trân trọng,',
            'view_response' => 'Xem phản hồi',
            'view_message' => 'Xem tin nhắn',
            'view_request' => 'Xem chi tiết yêu cầu',
            'view_pet' => 'Mở hồ sơ thú cưng',
            'browse_requests' => 'Xem các yêu cầu khác',
            'verify_email' => 'Xác minh Email',
            'reset_password' => 'Đặt lại mật khẩu',
            'accept_invitation' => 'Chấp nhận lời mời',
            'unsubscribe' => 'Hủy đăng ký',
            'button_trouble' => 'Nếu bạn gặp sự cố khi nhấp vào nút ":action", hãy sao chép và dán URL bên dưới vào trình duyệt web của bạn:',
            'footer_text' => 'Hãy nhớ phản hồi sớm để duy trì liên lạc với những người giúp đỡ tiềm năng.',
            'your_pet' => 'thú cưng của bạn',
            'a_pet' => 'một thú cưng',
            'the_pet' => 'thú cưng',
            'someone' => 'Ai đó',
            'a_vaccine' => 'vắc-xin',
            'soon' => 'sớm',
            'type' => 'Loại:',
            'location' => 'Vị trí:',
            'age' => 'Tuổi:',
            'years_old' => ':count tuổi',
            'status' => 'Trạng thái:',
        ],
        'verification' => [
            'title' => 'Xác minh địa chỉ Email của bạn',
            'welcome' => 'Chào mừng đến với :app!',
            'thanks_registering' => 'Cảm ơn bạn đã đăng ký với :app! Để hoàn tất đăng ký và bắt đầu quản lý việc chăm sóc mèo của bạn, vui lòng xác minh địa chỉ email bằng cách nhấp vào nút bên dưới.',
            'expire' => 'Liên kết xác minh này sẽ hết hạn sau :minutes phút vì lý do bảo mật.',
            'ignore' => 'Nếu bạn không tạo tài khoản với :app, bạn có thể bỏ qua email này.',
        ],
        'password_reset' => [
            'title' => 'Yêu cầu đặt lại mật khẩu',
            'intro' => 'Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản :app của bạn.',
            'account' => 'Tài khoản:',
            'requested_at' => 'Thời gian yêu cầu:',
            'click_button' => 'Nhấp vào nút bên dưới để đặt lại mật khẩu:',
            'notice_title' => 'Thông báo bảo mật:',
            'notice_expire' => 'Liên kết này sẽ hết hạn sau :minutes phút',
            'notice_ignore' => 'Nếu bạn không yêu cầu đặt lại, vui lòng bỏ qua email này',
            'notice_safety' => 'Mật khẩu của bạn sẽ không thay đổi trừ khi bạn nhấp vào liên kết trên',
            'support' => 'Nếu bạn gặp khó khăn khi truy cập tài khoản hoặc không yêu cầu đặt lại mật khẩu, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi.',
            'sent_from' => 'Email này được gửi từ :app',
            'unsubscribe_notice' => 'Nếu bạn không còn muốn nhận những email này, vui lòng cập nhật tùy chọn tài khoản hoặc liên hệ hỗ trợ.',
        ],
        'invitation' => [
            'title' => '🎉 Bạn được mời!',
            'intro' => ':inviter đã mời bạn tham gia :app.',
            'community' => 'Chúng tôi đang xây dựng một cộng đồng tuyệt vời và rất mong bạn cùng tham gia!',
            'notes_title' => 'Lưu ý quan trọng:',
            'note_personal' => 'Lời mời này là dành riêng cho bạn và không thể chia sẻ',
            'note_expire' => 'Liên kết lời mời sẽ hết hạn nếu không được sử dụng',
            'note_questions' => 'Nếu bạn có bất kỳ câu hỏi nào, chỉ cần trả lời email này',
            'closing' => 'Chúng tôi rất mong được chào đón bạn gia nhập cộng đồng!',
        ],
        'waitlist' => [
            'title' => '🎉 Bạn đã có tên trong danh sách chờ!',
            'intro' => 'Cảm ơn bạn đã quan tâm đến :app! Chúng tôi đã thêm bạn vào danh sách chờ thành công.',
            'next_steps_title' => 'Điều gì sẽ xảy ra tiếp theo?',
            'next_step_first' => 'Bạn sẽ là một trong những người đầu tiên biết khi chúng tôi có chỗ trống',
            'next_step_invite' => 'Chúng tôi sẽ gửi lời mời cho bạn sớm nhất có thể',
            'next_step_inbox' => 'Hãy chú ý theo dõi hộp thư đến để nhận thông tin mới nhất',
            'details_title' => 'Thông tin của bạn',
            'details_email' => 'Email:',
            'details_joined' => 'Thời gian tham gia:',
            'details_status' => 'Trạng thái:',
            'stay_connected_title' => 'Giữ kết nối',
            'stay_connected_intro' => 'Trong khi chờ đợi, bạn có thể:',
            'stay_connected_social' => 'Theo dõi chúng tôi trên mạng xã hội để cập nhật tin tức',
            'stay_connected_share' => 'Chia sẻ :app với bạn bè',
            'stay_connected_questions' => 'Trả lời email này nếu bạn có bất kỳ câu hỏi nào',
            'closing' => 'Chúng tôi rất mong sớm được chào đón bạn gia nhập cộng đồng!',
            'dont_want_wait_title' => 'Không muốn chờ đợi?',
            'dont_want_wait_text' => 'Nếu bạn có bạn bè đã là thành viên, hãy nhờ họ gửi lời mời cho bạn!',
            'unsubscribe_text' => 'Để hủy đăng ký nhận cập nhật từ danh sách chờ,',
            'click_here' => 'nhấp vào đây',
        ],
        'helper_response_accepted' => [
            'greeting' => 'Tin tuyệt vời, :name!',
            'intro' => 'Phản hồi giúp đỡ của bạn đã được chấp nhận! Chủ nuôi đã chọn bạn để chăm sóc thú cưng.',
            'about_pet' => 'Thông tin về :name:',
            'request_details' => '✓ Chi tiết yêu cầu:',
            'start_date' => 'Ngày bắt đầu:',
            'end_date' => 'Ngày kết thúc:',
            'special_notes' => 'Lưu ý đặc biệt:',
            'next_steps' => 'Chủ nuôi sẽ sớm liên lạc với bạn để phối hợp chi tiết bàn giao. Vui lòng chuẩn bị sẵn sàng cho:',
            'checklist_title' => 'Danh sách chuẩn bị:',
            'checklist_space' => 'Chuẩn bị không gian an toàn và thoải mái cho :pet',
            'checklist_supplies' => 'Chuẩn bị đầy đủ nhu yếu phẩm (thức ăn, cát vệ sinh, đồ chơi)',
            'checklist_medical' => 'Xem lại các hướng dẫn y tế hoặc chăm sóc từ chủ nuôi',
            'checklist_logistics' => 'Phối hợp các vấn đề vận chuyển/giao nhận',
            'checklist_contact' => 'Trao đổi thông tin liên lạc để duy trì trao đổi',
            'closing' => 'Cảm ơn bạn đã mở lòng và chuẩn bị ngôi nhà để giúp đỡ :pet đang cần. Sự tử tế của bạn tạo nên sự khác biệt!',
        ],
        'helper_response_canceled' => [
            'intro' => 'Một người giúp đỡ đã rút lại phản hồi cho yêu cầu của bạn.',
            'status_active' => 'Trạng thái: Yêu cầu của bạn vẫn đang hoạt động',
            'reason' => ':helper đã quyết định rút lại phản hồi. Điều này có thể do hoàn cảnh cá nhân hoặc sự cố về lịch trình.',
            'next_steps_title' => 'Điều gì tiếp theo?',
            'next_steps_intro' => 'Yêu cầu của bạn vẫn được mở và những người khác vẫn có thể phản hồi. Bạn có thể:',
            'next_step_review' => 'Xem xét các phản hồi hiện có khác',
            'next_step_wait' => 'Chờ đợi phản hồi mới từ những người giúp đỡ khác',
            'next_step_update' => 'Cập nhật lại chi tiết yêu cầu nếu cần thiết',
            'view_request' => 'Xem yêu cầu của bạn',
        ],
        'helper_response_rejected' => [
            'intro' => 'Cảm ơn bạn đã quan tâm giúp đỡ. Mặc dù phản hồi của bạn không được chọn lần này, chúng tôi rất trân trọng sự sẵn lòng của bạn.',
            'explanation' => 'Chủ nuôi đã chọn một người giúp đỡ khác cho :pet. Quyết định này có thể dựa trên nhiều yếu tố như vị trí, thời gian hoặc yêu cầu chăm sóc cụ thể.',
            'encouragement_title' => 'Đừng nản lòng nhé!',
            'encouragement_text' => 'Sự sẵn lòng giúp đỡ của bạn rất đáng quý, và còn rất nhiều thú cưng khác cần những người quan tâm như bạn. Chúng tôi khuyến khích bạn:',
            'encouragement_browse' => 'Tiếp tục tìm kiếm các yêu cầu khác',
            'encouragement_profile' => 'Giữ cho hồ sơ người giúp đỡ của bạn luôn cập nhật',
            'encouragement_types' => 'Xem xét các loại hình giúp đỡ khác nhau (nuôi tạm, nhận nuôi, chăm sóc ngắn hạn)',
            'mission' => 'Mọi thú cưng đều xứng đáng có một mái ấm yêu thương, và đóng góp của bạn giúp hiện thực hóa điều đó. Cảm ơn bạn đã tham gia cùng chúng tôi.',
            'stay_connected' => 'Giữ kết nối: Hãy chú ý theo dõi các yêu cầu mới phù hợp với sở thích của bạn. Sự kết hợp hoàn hảo có thể đang ở ngay gần đó!',
        ],
        'new_message' => [
            'intro' => 'Bạn vừa nhận được một tin nhắn mới từ :sender.',
        ],
        'pet_birthday' => [
            'title' => '🎂 Chúc mừng sinh nhật!',
            'intro' => 'Hôm nay là một ngày đặc biệt! :pet đang mừng sinh nhật lần thứ :age!',
            'intro_no_age' => 'Hôm nay là một ngày đặc biệt! :pet đang mừng sinh nhật!',
            'celebrate' => 'Đừng quên ăn mừng cùng chúng nhé! 🎉',
            'view_profile' => 'Bạn có thể xem hồ sơ của :pet tại đây:',
            'unsubscribe_notice' => 'Nếu bạn không muốn nhận những nhắc nhở này nữa, bạn có thể quản lý tùy chọn tại đây:',
        ],
        'placement_ended' => [
            'intro' => 'Việc chăm sóc đã kết thúc.',
            'status_returned' => 'Trạng thái: Đã trả về cho chủ nuôi',
            'explanation' => 'Chủ nuôi đã đánh dấu :pet đã được trả về, và việc chăm sóc hiện đã hoàn tất. Cảm ơn sự tận tâm và chăm sóc của bạn trong thời gian qua!',
            'thanks_helping' => 'Cảm ơn bạn đã giúp đỡ!',
            'contribution' => 'Đóng góp của bạn đã tạo nên sự khác biệt thực sự. Những người chủ nuôi như bạn giúp cộng đồng của chúng ta mạnh mẽ hơn.',
            'next_steps_intro' => 'Hãy cân nhắc giúp đỡ cho các yêu cầu trong tương lai',
            'next_step_profile' => 'Giữ cho hồ sơ của bạn luôn cập nhật',
            'next_step_share' => 'Chia sẻ trải nghiệm của bạn với những người khác',
            'closing' => 'Cảm ơn bạn đã là một phần của cộng đồng chăm sóc thú cưng của chúng tôi!',
        ],
        'placement_request_response' => [
            'intro' => 'Tin vui! Bạn vừa nhận được một phản hồi mới cho yêu cầu của bạn dành cho :pet',
            'helper_intro' => ':helper đã phản hồi yêu cầu của bạn.',
            'helper_interest' => 'Họ đang quan tâm đến việc giúp đỡ :pet.',
            'helper_details_title' => 'Chi tiết về người giúp đỡ:',
            'helper_available' => 'Sẵn sàng để:',
            'helper_foster_adopt' => 'Nuôi tạm và Nhận nuôi',
            'helper_foster' => 'Nuôi tạm',
            'helper_adopt' => 'Nhận nuôi',
            'helper_experience' => 'Kinh nghiệm:',
            'fallback_intro' => 'Ai đó đã phản hồi yêu cầu của bạn và quan tâm đến việc giúp đỡ thú cưng của bạn.',
            'closing' => 'Bạn có thể xem hồ sơ của họ và phản hồi bằng cách truy cập trang yêu cầu của bạn.',
        ],
        'transfer_confirmed' => [
            'intro' => 'Tin tuyệt vời! Việc bàn giao thực tế đã được xác nhận.',
            'placement_type' => 'Loại hình chăm sóc:',
            'confirmation' => ':helper đã xác nhận rằng họ đã nhận :pet.',
            'complete_title' => 'Hoàn tất bàn giao!',
            'active_intro' => 'Việc chăm sóc hiện đang hoạt động. Bạn có thể trao đổi với người giúp đỡ qua hệ thống tin nhắn của ứng dụng.',
            'closing' => 'Cảm ơn bạn đã sử dụng nền tảng của chúng tôi để tìm kiếm sự chăm sóc tốt nhất cho thú cưng của mình.',
        ],
        'vaccination_reminder' => [
            'title' => 'Nhắc nhở tiêm phòng',
            'intro' => 'Đây là nhắc nhở thân thiện rằng :pet cần tiêm :vaccine vào ngày :date.',
            'due_soon' => 'Đây là nhắc nhở thân thiện rằng :pet sắp đến hạn tiêm :vaccine.',
            'notes' => 'Ghi chú:',
            'view_health' => 'Bạn có thể xem hồ sơ sức khỏe của :pet tại đây:',
            'unsubscribe_notice' => 'Nếu bạn không muốn nhận những nhắc nhở này nữa, bạn có thể quản lý tùy chọn tại đây:',
        ],
        'habit_reminder' => [
            'title' => 'Nhắc nhở thói quen',
            'intro' => 'Đây là lời nhắc ghi lại :habit cho ngày :date.',
        ],
    ],
];
