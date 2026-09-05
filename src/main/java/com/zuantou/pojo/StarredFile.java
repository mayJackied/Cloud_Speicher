package com.zuantou.pojo;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@TableName("starred_file")
public class StarredFile {
    private Integer userId;
    private String starredFilePath;
}
