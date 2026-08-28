package com.zuantou.service.impl;

import com.zuantou.utils.UserContext;
import com.zuantou.config.MeinValFileProperties;
import com.zuantou.pojo.Result;
import com.zuantou.pojo.vo.MyFile;
import com.zuantou.service.FileService;
import com.zuantou.utils.Util;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class FileServiceImpl implements FileService {
    final private MeinValFileProperties fileProperties;


    @Override
    public Result<List<MyFile>> getFiles() {
        List<MyFile> myFiles = new ArrayList<>();
        List<String> list = Arrays.asList(fileProperties.getPublicPath(), fileProperties.getPath() + "/" + UserContext.getUserId().toString());
        for (String s : list) {
            myFiles.add(Util.getFiles(s));
        }
        return Result.success(myFiles);
    }

    public FileServiceImpl(MeinValFileProperties fileProperties) {
        this.fileProperties = fileProperties;
    }

}
