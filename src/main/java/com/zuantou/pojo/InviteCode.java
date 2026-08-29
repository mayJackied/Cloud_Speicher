package com.zuantou.pojo;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@TableName("invite_code")
public class InviteCode {
    public InviteCode(String inviteCode){
        this.inviteCode = inviteCode;
    }

    @TableId
    private String inviteCode;
    @TableLogic
    private boolean isDeleted;
}
