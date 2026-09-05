package com.zuantou.pojo.dto.file;

import lombok.Data;

@Data
public class ZipFileDTO {
    private String path;

    /**
     * 要求是个文件夹
     * 空字符串为默认路径: 原文件的父级路径
     */
    private String targetDir;
}
