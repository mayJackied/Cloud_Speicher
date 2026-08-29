package com.zuantou.pojo.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FilesVO {
    private List <FilesVO> filesVOS;
    private String fileName;
    private Long length;
    private Long lastModified;

    /**
     * ture: 是文件
     * false: 是文件夹 oder 不存在
     */
    @JsonProperty("is_file")
    private boolean file;
}
