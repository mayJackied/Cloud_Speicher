package com.zuantou.pojo.vo;

import lombok.Data;

@Data
public class LoginVO {
    private String token;
    private Integer userId;
    private String name;
    private boolean isAdmin;
}
