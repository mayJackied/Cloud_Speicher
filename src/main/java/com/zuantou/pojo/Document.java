package com.zuantou.pojo;

import lombok.Data;

@Data
public class Document {
    private Integer documentId;
    private String documentName;
    private double documentSize;
    private String path;
}
