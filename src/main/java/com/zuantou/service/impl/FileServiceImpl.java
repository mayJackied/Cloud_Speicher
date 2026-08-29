package com.zuantou.service.impl;

import com.zuantou.pojo.dto.FileDTO;
import com.zuantou.utils.UserContext;
import com.zuantou.config.MeinValFileProperties;
import com.zuantou.pojo.Result;
import com.zuantou.pojo.vo.FilesVO;
import com.zuantou.service.FileService;
import com.zuantou.utils.Util;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class FileServiceImpl implements FileService {
    final private MeinValFileProperties fileProperties;


    @Override
    public Result<List<FilesVO>> getFiles() {
        List<FilesVO> filesVOS = new ArrayList<>();
        List<String> list = Arrays.asList(fileProperties.getPublicPath(), fileProperties.getPath() + "/" + UserContext.getUserId().toString());
        for (String s : list) {
            filesVOS.add(Util.getFiles(s));
        }
        return Result.success(filesVOS);
    }

    @Override
    public Result<Void> addFile(FileDTO fileDTO) {
        File file = new File(fileDTO.getPath());
        if (fileDTO.isFile()) {
            try {
                file.createNewFile();
                return Result.success();
            } catch (IOException e) {
                return Result.error(e.toString());
            }
        }
        try {
            file.mkdir();
            return Result.success();
        } catch (Exception e) {
            return Result.error(e.toString());
        }
    }

    public FileServiceImpl(MeinValFileProperties fileProperties) {
        this.fileProperties = fileProperties;
    }

}
