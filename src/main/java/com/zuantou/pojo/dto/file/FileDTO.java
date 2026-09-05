package com.zuantou.pojo.dto.file;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class FileDTO {
    @JsonProperty("is_file")
    private boolean file;

    /**
     * 从相对路径的最底层文件开始
     * z.B. "../files/public/document/a.txt"
     */

    private String path;
}
