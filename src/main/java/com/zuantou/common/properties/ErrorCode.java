package com.zuantou.common.properties;

public final class ErrorCode {
    public static final Integer EXCEPTION = 99999;

    public static final Integer NOT_LOGIN = 10000;
    public static final Integer USER_NOT_FOUND = 10001;
    public static final Integer NOT_ADMIN = 10002;
    public static final Integer USERNAME_EMPTY = 10003;
    public static final Integer USERNAME_LENGTH_INVALID = 10004;
    public static final Integer USERNAME_FORMAT_INVALID = 10005;
    public static final Integer PASSWORD_EMPTY = 10006;
    public static final Integer PASSWORD_LENGTH_INVALID = 10007;
    public static final Integer PASSWORD_FORMAT_INVALID = 10008;
    public static final Integer INVITE_CODE_EMPTY = 10009;
    public static final Integer INVITE_CODE_INVALID = 10010;
    public static final Integer USERNAME_OR_PASSWORD_INVALID = 10011;
    public static final Integer DELETE_USER_FAILED = 10012;
    public static final Integer BLACKLISTED_JWT = 10013;

    public static final Integer NO_PERMISSION = 20001;
    public static final Integer FILE_OPERATION_FAILED = 20002;
    public static final Integer FILE_NAME_ILLEGAL = 20003;
    public static final Integer FILE_NOT_FOUND = 20004;
    public static final Integer FILE_ILLEGAL = 20005;
    public static final Integer FILE_DUPLICATE = 20006;
    public static final Integer BIN_FILE_NOT_ALLOWED = 20007;
    public static final Integer UPLOAD_KEY_NOT_FOUND = 20008;
    public static final Integer FILE_STARRED = 20009;

    public static final Integer ARGS_ILLEGAL = 30001;
}