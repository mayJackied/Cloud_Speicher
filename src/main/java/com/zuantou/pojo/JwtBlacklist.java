package com.zuantou.pojo;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@TableName("jwt_blacklist")
public class JwtBlacklist {
    @TableId
    private String jwt;
    private Long expireTime;
}
