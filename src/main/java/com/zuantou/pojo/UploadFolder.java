package com.zuantou.pojo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class UploadFolder {
    @JsonProperty("is_file")
    private boolean file;
    private String uploadFilePath;
    private int status; // 0 未下载, 1 正在正在下载, 2 下载完成
    private List<UploadFolder.Folder> initUploadFolders;

    @Data
    public static class Folder{
        @JsonProperty("is_file")
        private boolean file;
        private String fileName;
        private int status; // 0 未下载, 1 正在正在下载, 2 下载完成
        private List<UploadFolder.Folder> initUploadFolders;
    }
}
