package com.zuantou.pojo.dto.file;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RenameFileDTO {
    private String path;
    @JsonProperty("new_name")
    private String newName;
}
