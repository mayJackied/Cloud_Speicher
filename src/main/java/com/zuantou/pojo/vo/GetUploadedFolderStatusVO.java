package com.zuantou.pojo.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
public class GetUploadedFolderStatusVO {
    private String uploadFilePath;
    private int status; // 0 未下载, 1 正在正在下载, 2 下载完成
    private Long size; // -1 下载完成
}
