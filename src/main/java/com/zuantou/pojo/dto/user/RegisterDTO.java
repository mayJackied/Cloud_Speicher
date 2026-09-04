package com.zuantou.pojo.dto.user;

import lombok.Data;

@Data
public class RegisterDTO {
    private String name;
    private String password;
    private String inviteCode;
}
