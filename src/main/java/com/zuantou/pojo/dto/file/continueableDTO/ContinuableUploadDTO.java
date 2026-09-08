package com.zuantou.pojo.dto.file.continueableDTO;

import lombok.Data;

@Data
public class ContinuableUploadDTO {
    /**
     * targetPath 为上传文件的文件夹
     */
    private String uploadKey;
    private String targetPath;
}
