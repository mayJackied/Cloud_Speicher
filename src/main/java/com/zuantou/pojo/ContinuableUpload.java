package com.zuantou.pojo;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@TableName("continuable_upload")
public class ContinuableUpload {
    @TableId
    private String uploadKey;
    private String uploadFilePath;
}
