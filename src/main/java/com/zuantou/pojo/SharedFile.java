package com.zuantou.pojo;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@TableName("shared_file")
public class SharedFile {
    private Integer shareeId;
    private Integer sharerId;
    private String sharedFilePath;
    private String shareLink;
    private String fileName;
    private Long length;
    private Long lastModified;
    private boolean isFile;
}
