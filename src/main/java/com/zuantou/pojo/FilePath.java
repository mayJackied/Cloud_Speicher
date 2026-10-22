package com.zuantou.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;


@Data
@AllArgsConstructor
public class FilePath {
    String path;
    boolean isFile;
}
