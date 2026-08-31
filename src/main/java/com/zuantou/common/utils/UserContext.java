package com.zuantou.common.utils;

public class UserContext {
    private static final ThreadLocal<Integer> USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> BLACKLISTED_JWT = new ThreadLocal<>();

    public static void setUserId(Integer userId) {
        USER_ID.set(userId);
    }

    public static Integer getUserId() {
        return USER_ID.get();
    }

    public static void setBlacklistedJwt(String blacklistedJwt) {
        BLACKLISTED_JWT.set(blacklistedJwt);
    }

    public static String getBlacklistedJwt() {
        return BLACKLISTED_JWT.get();
    }

    public static void clear() {
        USER_ID.remove();
        BLACKLISTED_JWT.remove();
    }
}
