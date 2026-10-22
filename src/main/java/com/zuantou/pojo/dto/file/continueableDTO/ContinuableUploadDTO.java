package com.zuantou.pojo.dto.file.continueableDTO;

import lombok.Data;

@Data
public class ContinuableUploadDTO {
    /**
     * filePath 为上传文件的路径
     */
    private String uploadKey;
    private String filePath;
}
