package com.zuantou.pojo.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FileVOS {
    private List<FileListVO> fileListVOS;
    private List<SharedFileVO> sharedFileVOS;
}
