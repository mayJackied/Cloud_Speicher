package com.zuantou.service.impl;

import com.zuantou.common.exception.BusinessException;
import com.zuantou.common.properties.ErrorCode;
import com.zuantou.common.utils.ZipUtil;
import com.zuantou.mapper.UserMapper;
import com.zuantou.pojo.User;
import com.zuantou.pojo.dto.*;
import com.zuantou.common.utils.UserContext;
import com.zuantou.common.properties.MyValFileProperties;
import com.zuantou.pojo.Result;
import com.zuantou.pojo.vo.FilesVO;
import com.zuantou.service.FileService;
import com.zuantou.common.utils.Util;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class FileServiceImpl implements FileService {
    private final MyValFileProperties fileProperties;
    private final UserMapper userMapper;

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
    public Result<Void> addFile(FileDTO addFileDTO) {
        Integer errorCode = checkFilePermission(addFileDTO.getPath());
        if (errorCode != null) {
            return Result.error(errorCode);
        }

        File file = new File(addFileDTO.getPath());
        if (addFileDTO.isFile()) {
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
        Integer errorCode = checkFilePermission(deleteFileDTO.getPath());
        if (errorCode != null) {
            return Result.error(errorCode);
        }

        File file = new File(deleteFileDTO.getPath());
        if (!file.delete()) {
            return Result.error(ErrorCode.FILE_OPERATION_FAILED);
        }

        return Result.success();
    }

    @Override
    public Result<Void> renameFile(RenameFileDTO renameFileDTO) {
        if (renameFileDTO.getNewName() == null || renameFileDTO.getNewName().isBlank() || renameFileDTO.getNewName().equals(".") || renameFileDTO.getNewName().equals("..") || renameFileDTO.getNewName().contains("/") || renameFileDTO.getNewName().contains("\\")) {
            return Result.error(ErrorCode.FILE_NAME_ILLEGAL);
        }

        Integer errorCode = checkFilePermission(renameFileDTO.getPath());
        if (errorCode != null) {
            return Result.error(errorCode);
        }

        File oldFile = new File(renameFileDTO.getPath());
        File newFile = new File(oldFile.getParentFile(), renameFileDTO.getNewName());
        if (!oldFile.renameTo(newFile)) {
            return Result.error(ErrorCode.FILE_OPERATION_FAILED);
        }
        return Result.success();
    }

    @Override
    public Result<Void> uploadFile(UploadFileDTO uploadFileDTO) {
        Integer errorCode = checkFilePermission(uploadFileDTO.getPath());
        if (errorCode != null) {
            return Result.error(errorCode);
        }

        MultipartFile multipartFile = uploadFileDTO.getFile();

        if (multipartFile == null || multipartFile.isEmpty()) {
            return Result.error(ErrorCode.FILE_OPERATION_FAILED);
        }

        String fileName = multipartFile.getOriginalFilename();

        if (fileName == null || fileName.isBlank()) {
            return Result.error(ErrorCode.FILE_NAME_ILLEGAL);
        }


        File file = new File(uploadFileDTO.getPath(), fileName);
        try {
            file.createNewFile();
        } catch (IOException e) {
            return Result.error(ErrorCode.EXCEPTION);
        }

        Path target = Paths.get(
                fileProperties.getPath(),
                UserContext.getUserId().toString(),
                fileName
        ).toAbsolutePath().normalize();

        try {
            multipartFile.transferTo(target.toFile());
        } catch (IOException e) {
            return Result.error(ErrorCode.FILE_OPERATION_FAILED);
        }


        return Result.success();
    }

    @Override
    public void downloadFile(DownloadFileDTO downloadFileDTO, HttpServletResponse response) {
        Integer errorCode = checkFilePermission(downloadFileDTO.getPath());

        if (errorCode != null) {
            throw new BusinessException(errorCode);
        }

        File file = new File(downloadFileDTO.getPath());

        if (!file.exists() || !file.isFile()) {
            throw new BusinessException(ErrorCode.FILE_NOT_FOUND);
        }

        response.setContentType("application/octet-stream");

        response.setHeader(
                "Content-Disposition",
                "attachment; filename=\"" + file.getName() + "\""
        );

        try (
                FileInputStream inputStream = new FileInputStream(file);

                OutputStream outputStream = response.getOutputStream()
        ) {

            byte[] buffer = new byte[8192];

            int length;

            while ((length = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, length);
            }

        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public Result<Void> zip(ZipFileDTO zipFileDTO) {
        Integer errorCode = checkFilePermission(zipFileDTO.getPath());
        if (errorCode != null) {
            return Result.error(errorCode);
        }

        try {
            return ZipUtil.zip(zipFileDTO.getPath(),zipFileDTO.getTargetDir());
        } catch (IOException e) {
            return Result.error(ErrorCode.EXCEPTION);
        }
    }

    @Override
    public Result<Void> unzip(ZipFileDTO zipFileDTO) {
        Integer errorCode = checkFilePermission(zipFileDTO.getPath());
        if (errorCode != null) {
            return Result.error(errorCode);
        }

        try {
            return ZipUtil.unzip(zipFileDTO.getPath(),zipFileDTO.getTargetDir());
        } catch (IOException e) {
            return Result.error(ErrorCode.EXCEPTION);
        }
    }

    private Integer checkFilePermission(String path) {
        Path target = Paths.get(path).toAbsolutePath().normalize();
        if (target.toFile().exists()) {
            return ErrorCode.FILE_NOT_FOUND;
        }
        Path publicPath = Paths.get(fileProperties.getPublicPath()).toAbsolutePath().normalize();
        Path userPath = Paths.get(fileProperties.getPath(), UserContext.getUserId().toString()).toAbsolutePath().normalize();

        User user = userMapper.selectById(UserContext.getUserId());
        if (user == null){
            return ErrorCode.USER_NOT_FOUND;
        }
        boolean admin = user.isAdmin();

        if (!target.startsWith(userPath) && !target.startsWith(publicPath)) {
            return ErrorCode.NO_PERMISSION;
        }

        if (target.startsWith(userPath) || admin) {
            return null;
        }
        return ErrorCode.NO_PERMISSION;
    }

    public FileServiceImpl(MyValFileProperties fileProperties, UserMapper userMapper) {
        this.fileProperties = fileProperties;
        this.userMapper = userMapper;
    }
}
