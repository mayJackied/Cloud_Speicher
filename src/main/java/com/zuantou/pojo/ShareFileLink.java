package com.zuantou.pojo;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor

@TableName("share_file_links")
public class ShareFileLink {
    @TableId
    private String shareLink;
    private Integer sharerId;
    private String shareFilePath;
    private Long expireTime;
}
