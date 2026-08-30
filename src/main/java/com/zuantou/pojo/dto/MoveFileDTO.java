package com.zuantou.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MoveFileDTO {
    private String path;
    /**
     * 禁止为空
     */
    private String targetDir;

    /**
     * 如果存在同名文件处理方式
     * 0 默认值, 不处理; 1 替换; 2 忽略(前端一般不发送这个请求)
     */
    private Integer fileHandle;
}
