package com.zuantou.pojo;

import lombok.Data;

@Data
public class User {
    private Integer userId;
    private String password;
    private String name;
    private boolean isDelete;
    private Integer documentId;
}
