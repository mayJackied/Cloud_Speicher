package com.zuantou.pojo;

import com.baomidou.mybatisplus.annotation.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@TableName("user")
public class User {
    @TableId(type = IdType.AUTO)
    private Integer userId;
    private String password;
    private String name;
    @TableLogic
    private boolean isDeleted;
    private Integer documentId;
    private boolean isAdmin;
}
