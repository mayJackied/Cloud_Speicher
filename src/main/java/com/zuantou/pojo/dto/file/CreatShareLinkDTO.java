package com.zuantou.pojo.dto.file;

import lombok.Data;

@Data
public class CreatShareLinkDTO {
    private String shareFilePath;
    private Double expireDuration; //单位为小时 如果为0的话就是默认24小时

}
