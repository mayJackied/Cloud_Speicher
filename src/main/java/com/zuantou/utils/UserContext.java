package com.zuantou.utils;

public class UserContext {
    private static final ThreadLocal<Integer> USER_ID = new ThreadLocal<>();

    public static void setUserId(Integer userId){
        USER_ID.set(userId);
    }

    public static Integer getUserId(){
        return USER_ID.get();
    }

    public static void clear(){
        USER_ID.remove();
    }
}
