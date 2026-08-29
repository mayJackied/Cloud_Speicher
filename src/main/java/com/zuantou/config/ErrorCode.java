package com.zuantou.config;

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

    public static final Integer NO_PERMISSION = 20001;
    public static final Integer FILE_OPERATION_FAILED = 20002;
    public static final Integer FILE_NAME_ILLEGAL = 20003;
}