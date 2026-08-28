package com.zuantou.pojo.vo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import lombok.Data;

@Data
public class UserVO {
    @TableId(type = IdType.AUTO)
    private Integer userId;
    private String name;
    private boolean isDelete;
    private Integer documentId;
    private boolean isAdmin;
}
