package com.zuantou.pojo.dto.file.continueableDTO;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class InitUploadFolderDTO {
    @JsonProperty("is_file")
    private boolean file;
    private String uploadFilePath;
}
