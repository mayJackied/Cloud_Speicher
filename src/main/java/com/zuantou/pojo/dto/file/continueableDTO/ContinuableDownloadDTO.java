package com.zuantou.pojo.dto.file.continueableDTO;

import lombok.Data;

@Data
public class ContinuableDownloadDTO {
    /**
     * targetPath 为上传文件的文件夹
     */
    private String downloadFilePath;
    private Long downloadedSize;
    private int DownloadType; // 0: 首次下载, 1: 断点重连

    public static final int FIRST_DOWNLOAD_TYPE = 0;
    public static final int NOT_FIRST_DOWNLOAD_TYPE = 1;
}
