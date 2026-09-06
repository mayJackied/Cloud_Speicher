package com.zuantou.pojo.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SharedFileVO {
    private FileListVO fileListVO;
    private Integer sharerId;
    private String sharedFilePath;
}
