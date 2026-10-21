package com.zuantou.pojo.dto.file.continueableDTO;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class InitUploadFolderDTO {
    private String uploadFilePath;
    private List<InitUploadFolder> initUploadFolders;

    @Data
    public static class InitUploadFolder{
        @JsonProperty("is_file")
        private boolean file;
        private String fileName;
        private List<InitUploadFolder> initUploadFolders;
    }
}
