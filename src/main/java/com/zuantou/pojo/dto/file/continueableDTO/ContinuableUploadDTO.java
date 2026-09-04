package com.zuantou.pojo.dto.file.continueableDTO;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class ContinuableUploadDTO {
    /**
     * targetPath 为上传文件的文件夹
     */
    private String uploadKey;
    private String targetPath;
    private MultipartFile multipartFile;
    private int UploadType; // 0: 首次上传, 1: 断点重连

    public static final int FIRST_UPLOAD_TYPE = 0;
    public static final int NOT_FIRST_UPLOAD_TYPE = 1;
}
