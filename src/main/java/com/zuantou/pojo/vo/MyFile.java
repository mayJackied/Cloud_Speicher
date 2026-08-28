package com.zuantou.pojo.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MyFile {
    private List <MyFile> myFiles;
    private String fileName;
    private Long length;
    private Long lastModified;
    private boolean isFile;
}
