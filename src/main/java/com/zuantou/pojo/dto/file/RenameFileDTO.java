package com.zuantou.pojo.dto.file;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class RenameFileDTO {
    private String path;
    @JsonProperty("new_name")
    private String newName;
}
