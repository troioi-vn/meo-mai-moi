<?php

declare(strict_types=1);

return [
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
];
