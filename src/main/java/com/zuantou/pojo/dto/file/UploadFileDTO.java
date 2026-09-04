package com.zuantou.pojo.dto.file;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UploadFileDTO {
    /**
     * path 需要上传文件的文件夹地址
     * file 自己要上传文件的路径
     */
    private String path;
    private MultipartFile file;
}