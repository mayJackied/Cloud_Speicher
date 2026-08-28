package com.zuantou.service;

import com.zuantou.pojo.Result;
import com.zuantou.pojo.vo.MyFile;

import java.util.List;

public interface FileService {
    Result<List<MyFile>> getFiles();
}
