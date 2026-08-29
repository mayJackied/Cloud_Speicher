package com.zuantou.pojo.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class LoginVO {
    private String token;
    private Integer userId;
    private String name;
    @JsonProperty("is_admin")
    private boolean admin;
}
