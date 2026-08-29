package com.zuantou.service.impl;

import com.zuantou.config.ErrorCode;
import com.zuantou.mapper.UserMapper;
import com.zuantou.pojo.dto.DeleteFileDTO;
import com.zuantou.pojo.dto.FileDTO;
import com.zuantou.pojo.dto.RenameFileDTO;
import com.zuantou.utils.UserContext;
import com.zuantou.config.MyValFileProperties;
import com.zuantou.pojo.Result;
import com.zuantou.pojo.vo.FilesVO;
import com.zuantou.service.FileService;
import com.zuantou.utils.Util;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class FileServiceImpl implements FileService {
    final private MyValFileProperties fileProperties;
    final private UserMapper userMapper;


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
                return Result.error(ErrorCode.EXCEPTION);
            }
        }
        try {
            file.mkdir();
            return Result.success();
        } catch (Exception e) {
            return Result.error(ErrorCode.EXCEPTION);
        }
    }

    @Override
    public Result<Void> deleteFile(DeleteFileDTO deleteFileDTO) {
        if (!hasFilePermission(deleteFileDTO.getPath())) {
            return Result.error(ErrorCode.NO_PERMISSION);
        }

        File file = new File(deleteFileDTO.getPath());
        if (!file.delete()) {
            return Result.error(ErrorCode.FILE_OPERATION_FAILED);
        }

        return Result.success();
    }

    @Override
    public Result<Void> renameFile(RenameFileDTO renameFileDTO) {
        if (!hasFilePermission(renameFileDTO.getPath())) {
            return Result.error(ErrorCode.NO_PERMISSION);
        }
        if (renameFileDTO.getNewName() != null
                && !renameFileDTO.getNewName().isBlank()
                && !renameFileDTO.getNewName().equals(".")
                && !renameFileDTO.getNewName().equals("..")
                && !renameFileDTO.getNewName().contains("/")
                && !renameFileDTO.getNewName().contains("\\")) {
            File oldFile = new File(renameFileDTO.getPath());
            File newFile = new File(oldFile.getParentFile(), renameFileDTO.getNewName());
            if (!oldFile.renameTo(newFile)) {
                return Result.error(ErrorCode.FILE_OPERATION_FAILED);
            }
            return Result.success();
        }
        return Result.error(ErrorCode.FILE_NAME_ILLEGAL);
    }

    private boolean hasFilePermission(String path){
        Path target = Paths.get(path).toAbsolutePath().normalize();
        Path publicPath = Paths.get(fileProperties.getPublicPath()).toAbsolutePath().normalize();
        Path userPath = Paths.get(fileProperties.getPath(), UserContext.getUserId().toString()).toAbsolutePath().normalize();

        boolean admin = userMapper.selectById(UserContext.getUserId()).isAdmin();

        if (!target.startsWith(userPath) && !target.startsWith(publicPath)){
            return false;
        }

        return !target.startsWith(publicPath) || admin;
    }

    public FileServiceImpl(MyValFileProperties fileProperties, UserMapper userMapper) {
        this.fileProperties = fileProperties;
        this.userMapper = userMapper;
    }

}
