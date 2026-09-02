package com.zuantou.service.impl;

import com.zuantou.common.exception.BusinessException;
import com.zuantou.common.properties.CommonProperties;
import com.zuantou.common.properties.ErrorCode;
import com.zuantou.common.utils.ZipUtil;
import com.zuantou.mapper.DeleteBinFileSourceMapper;
import com.zuantou.mapper.UserMapper;
import com.zuantou.pojo.DeleteBinFileSource;
import com.zuantou.pojo.User;
import com.zuantou.pojo.dto.*;
import com.zuantou.common.utils.UserContext;
import com.zuantou.common.properties.MyValFileProperties;
import com.zuantou.pojo.Result;
import com.zuantou.pojo.vo.FilesVO;
import com.zuantou.service.FileService;
import com.zuantou.common.utils.FileUtil;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Service
public class FileServiceImpl implements FileService {
    private final MyValFileProperties fileProperties;
    private final UserMapper userMapper;
    private final DeleteBinFileSourceMapper deleteBinFileSourceMapper;

    @Override
    public Result<List<FilesVO>> getFiles() {
        List<FilesVO> filesVOS = new ArrayList<>();
        List<String> list = Arrays.asList(fileProperties.getPublicPath(), fileProperties.getPath() + "/" + UserContext.getUserId().toString());
        for (String s : list) {
            filesVOS.add(FileUtil.getFiles(s));
        }
        return Result.success(filesVOS);
    }

    @Override
    public Result<Void> addFile(FileDTO addFileDTO) {
        Integer errorCode = checkFilePermission(addFileDTO.getPath(), OTHER, CommonProperties.COMMON_PATH_OPERATION);
        if (errorCode != null) {
            return Result.error(errorCode);
        }

        File file = new File(addFileDTO.getPath());
        if (addFileDTO.isFile()) {
            try {
                if (!file.createNewFile()) {
                    return Result.error(ErrorCode.EXCEPTION);
                }
                return Result.success();
            } catch (IOException e) {
                return Result.error(ErrorCode.EXCEPTION);
            }
        }
        try {
            if (!file.mkdir()) {
                return Result.error(ErrorCode.EXCEPTION);
            }
            return Result.success();
        } catch (Exception e) {
            return Result.error(ErrorCode.EXCEPTION);
        }
    }

    @Override
    public Result<Void> deleteFile(DeleteFileDTO deleteFileDTO) {
        deleteBinFileSourceMapper.insert(deleteFileMethode(deleteFileDTO));
        return Result.success();
    }

    @Override
    public Result<Void> deleteFiles(List<DeleteFileDTO> deleteFileDTOS) {
        List<DeleteBinFileSource> deleteBinFileSources = new ArrayList<>();
        for (DeleteFileDTO deleteFileDTO : deleteFileDTOS) {
            deleteBinFileSources.add(deleteFileMethode(deleteFileDTO));
        }
        deleteBinFileSourceMapper.insert(deleteBinFileSources);
        return Result.success();
    }

    private DeleteBinFileSource deleteFileMethode(DeleteFileDTO deleteFileDTO){
        Integer errorCode = checkFilePermission(deleteFileDTO.getPath(), OTHER, CommonProperties.COMMON_PATH_OPERATION);
        if (errorCode != null) {
            throw new BusinessException(errorCode);
        }
        Path oldPath = Paths.get(deleteFileDTO.getPath()).toAbsolutePath().normalize();
        Path publicPath = Paths.get(fileProperties.getPublicPath()).toAbsolutePath().normalize();
        Path targetDir;
        if (oldPath.startsWith(publicPath)) {
            targetDir = Paths.get(fileProperties.getPublicPath(), fileProperties.getRecycleBinName());
        } else {
            targetDir = Paths.get(fileProperties.getPath(), fileProperties.getRecycleBinName());
        }

        File newFile = new File(targetDir.toString(), String.valueOf(oldPath.getFileName()));

        if (newFile.exists()){
            newFile = insertedFile(oldPath.toFile(), targetDir.toFile());
        }
        try {
            Files.move(oldPath, newFile.toPath());
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.EXCEPTION);
        }
        return new DeleteBinFileSource(deleteFileDTO.getPath(), newFile.getPath(), System.currentTimeMillis());
    }

    @Override
    public Result<Void> renameFile(RenameFileDTO renameFileDTO) {
        if (renameFileDTO.getNewName() == null || renameFileDTO.getNewName().isBlank() || renameFileDTO.getNewName().equals(".") || renameFileDTO.getNewName().equals("..") || renameFileDTO.getNewName().contains("/") || renameFileDTO.getNewName().contains("\\")) {
            return Result.error(ErrorCode.FILE_NAME_ILLEGAL);
        }

        Integer errorCode = checkFilePermission(renameFileDTO.getPath(), OTHER, CommonProperties.COMMON_PATH_OPERATION);
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
        Integer errorCode = checkFilePermission(uploadFileDTO.getPath(), OTHER, CommonProperties.COMMON_PATH_OPERATION);
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
            if (!file.createNewFile()) {
                return Result.error(ErrorCode.EXCEPTION);
            }
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
        Integer errorCode = checkFilePermission(downloadFileDTO.getPath(), SEARCH_AND_DOWNLOAD, CommonProperties.COMMON_PATH_OPERATION);

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
        Integer errorCode = checkFilePermission(zipFileDTO.getPath(), OTHER, CommonProperties.COMMON_PATH_OPERATION);
        if (errorCode != null) {
            return Result.error(errorCode);
        }

        try {
            return ZipUtil.zip(zipFileDTO.getPath(), zipFileDTO.getTargetDir());
        } catch (IOException e) {
            return Result.error(ErrorCode.EXCEPTION);
        }
    }

    @Override
    public Result<Void> unzip(ZipFileDTO zipFileDTO) {
        Integer errorCode = checkFilePermission(zipFileDTO.getPath(), OTHER, CommonProperties.COMMON_PATH_OPERATION);
        if (errorCode != null) {
            return Result.error(errorCode);
        }

        try {
            return ZipUtil.unzip(zipFileDTO.getPath(), zipFileDTO.getTargetDir());
        } catch (IOException e) {
            return Result.error(ErrorCode.EXCEPTION);
        }
    }

    @Override
    public Result<Void> moveFile(MoveFileDTO moveFileDTO) {
        if (moveFileDTO.getTargetDir() == null || moveFileDTO.getTargetDir().isEmpty()) {
            return Result.error(ErrorCode.FILE_ILLEGAL);
        }

        Integer i1 = checkFilePermission(moveFileDTO.getPath(), OTHER, CommonProperties.COMMON_PATH_OPERATION);
        if (i1 != null) {
            return Result.error(i1);
        }
        File path2 = new File(moveFileDTO.getTargetDir());
        if (path2.isFile()) {
            return Result.error(ErrorCode.FILE_ILLEGAL);
        }
        Integer i2 = checkFilePermission(moveFileDTO.getTargetDir(), OTHER, CommonProperties.COMMON_PATH_OPERATION);
        if (i2 != null) {
            return Result.error(i2);
        }

        File f1 = new File(moveFileDTO.getPath());
        File f2 = new File(path2, f1.getName());

        if (f1.toPath().equals(f2.toPath())) {
            return Result.error(ErrorCode.FILE_ILLEGAL);
        }
        if (f2.exists()) {
            if (moveFileDTO.getFileHandle() != CommonProperties.REPLACE) {
                switch (moveFileDTO.getFileHandle()) {
                    case CommonProperties.IGNORE -> {
                        return Result.success();
                    }
                    case CommonProperties.DEFAULT -> {
                        return Result.error(ErrorCode.FILE_DUPLICATE);
                    }
                }
            }
            if (!f2.delete()) {
                return Result.error(ErrorCode.EXCEPTION);
            }
        }
        try {
            Files.move(f1.toPath(), f2.toPath());
            return Result.success();
        } catch (IOException e) {
            return Result.error(ErrorCode.EXCEPTION);
        }
    }

    // (1.移除回收站某一个文件, 清空回收站;) 定时清除回收站过期文件; (回收站文件还原;)( 回收站文件禁止使用所有普通文件的方法进行操作)

    @Override
    public Result<Void> deleteBinFile(DeleteFileDTO deleteFileDTO) {
        Integer errorCode = checkFilePermission(deleteFileDTO.getPath(), OTHER, CommonProperties.BIN_PATH_OPERATION);
        if (errorCode != null) {
            return Result.error(errorCode);
        }

        Path binPath = isBinPath(deleteFileDTO.getPath());
        if (binPath == null) {
            return Result.error(ErrorCode.FILE_ILLEGAL);
        }

        if (!binPath.toFile().delete()) {
            return Result.error(ErrorCode.EXCEPTION);
        }
        return Result.success();
    }

    @Override
    public Result<Void> deleteBinAllFiles(DeleteBinAllFilesDTO deleteBinAllFilesDTO) {
        String path = "";
        switch (deleteBinAllFilesDTO.getPathType()) {
            case CommonProperties.PUBLIC_PATH ->
                    path = fileProperties.getPublicPath() + fileProperties.getRecycleBinName();
            case CommonProperties.USER_PATH -> path = fileProperties.getPath() + fileProperties.getRecycleBinName();
        }

        Integer errorCode = checkFilePermission(path, OTHER, CommonProperties.BIN_PATH_OPERATION);
        if (errorCode != null) {
            return Result.error(errorCode);
        }

        File file = new File(path);
        if (!file.delete()) {
            return Result.error(ErrorCode.EXCEPTION);
        }
        return Result.success();
    }

    @Override
    public Result<Void> restoreFile(DeleteFileDTO deleteFileDTO) {
        DeleteBinFileSource deleteBinFileSource = deleteBinFileSourceMapper.selectById(deleteFileDTO.getPath());
        File newFile = new File(deleteBinFileSource.getOldPath());
        File oldFile = new File(deleteBinFileSource.getNewPath());
        if (newFile.exists()){
            newFile = insertedFile(oldFile, newFile.getParentFile());
        }
        try {
            Files.move(oldFile.toPath(),newFile.toPath());
        } catch (IOException e) {
            return Result.error(ErrorCode.EXCEPTION);
        }
        deleteBinFileSourceMapper.deleteById(deleteBinFileSource.getNewPath());
        return Result.success();
    }


    private Integer checkFilePermission(String path, int operationType, int fileType) {
        Path target = Paths.get(path).toAbsolutePath().normalize();
        if (!target.toFile().exists()) {
            return ErrorCode.FILE_NOT_FOUND;
        }
        Path publicPath;
        Path userPath;

        switch (fileType) {
            case CommonProperties.COMMON_PATH_OPERATION -> {
                publicPath = Paths.get(fileProperties.getPublicPath()).toAbsolutePath().normalize();
                userPath = Paths.get(fileProperties.getPath(), UserContext.getUserId().toString()).toAbsolutePath().normalize();
            }
            case CommonProperties.BIN_PATH_OPERATION -> {
                publicPath = Paths.get(fileProperties.getPublicPath() + fileProperties.getRecycleBinName()).toAbsolutePath().normalize();
                userPath = Paths.get(fileProperties.getPath() + fileProperties.getRecycleBinName()).toAbsolutePath().normalize();
            }
            default -> {
                return ErrorCode.EXCEPTION;
            }
        }

        User user = userMapper.selectById(UserContext.getUserId());
        if (user == null) {
            return ErrorCode.USER_NOT_FOUND;
        }
        boolean admin = user.isAdmin();

        if (!target.startsWith(userPath) && !target.startsWith(publicPath)) {
            return ErrorCode.NO_PERMISSION;
        }

        if (fileType == CommonProperties.COMMON_PATH_OPERATION) {
            if (target.startsWith(publicPath) || target.startsWith(userPath)) {
                return ErrorCode.BIN_FILE_NOT_ALLOWED;
            }
        }

        if (target.startsWith(userPath) || admin || (operationType == SEARCH_AND_DOWNLOAD && !target.startsWith(userPath))) {
            return null;
        }
        return ErrorCode.NO_PERMISSION;
    }

    private Path isBinPath(String path) {
        Path binPath = Paths.get(path).toAbsolutePath().normalize();
        Path publicBinPath = Paths.get(fileProperties.getPublicPath() + fileProperties.getRecycleBinName()).toAbsolutePath().normalize();
        Path userBinPath = Paths.get(fileProperties.getPath() + fileProperties.getRecycleBinName()).toAbsolutePath().normalize();

        if (binPath.startsWith(publicBinPath)) {
            return binPath;
        }
        if (binPath.startsWith(userBinPath)) {
            return binPath;
        }
        return null;
    }

    private File insertedFile(File oldFile, File targetDir) {
        String originalName = oldFile.getName();
        File newFile;
        if (!originalName.contains("(") && !originalName.contains(")")) {
            newFile = new File(targetDir, insertFileName(oldFile, String.valueOf(1)));
            if (!newFile.exists()) {
                return newFile;
            }
        }
        List<Integer> numberList = new ArrayList<>();
        StringBuilder oldNameSB = new StringBuilder();
        String[] vorC = originalName.split("\\(");
        String[] nachD = originalName.split("\\)");
        for (int i = 0; i < vorC.length - 1; i++) {
            oldNameSB.append(vorC[i]);
        }
        oldNameSB.append(nachD[nachD.length - 1]);

        for (String fileName : Objects.requireNonNull(targetDir.list())) {
            if (fileName.contains("(") && fileName.contains(")")) {
                StringBuilder fileNameSB = new StringBuilder();
                String[] splitC = fileName.split("\\(");

                for (int i = 0; i < splitC.length - 1; i++) {
                    fileNameSB.append(splitC[i]);
                }

                String[] splitD = splitC[splitC.length - 1].split("\\)");
                fileNameSB.append(splitD[splitD.length - 1]);
                if (oldNameSB.compareTo(fileNameSB) != 0) {
                    continue;
                }
                int i;
                try {
                    i = Integer.parseInt(splitD[0]);
                } catch (NumberFormatException e) {
                    continue;
                }
                numberList.add(i);
            }
        }
        numberList.sort(Comparator.comparingInt(o -> o));
        int number = 1;
        for (Integer i : numberList) {
            if (number != i) {
                break;
            }
            number++;
        }
        String insertNumber = String.valueOf(number);

        return new File(targetDir, insertFileName(oldFile, insertNumber));
    }

    private String insertFileName(File oldFile, String insertNumber) {
        StringBuilder newName = new StringBuilder();
        if (oldFile.isFile()) {
            String[] split = oldFile.getName().split("\\.");
            if (split.length == 1 || split[0].isEmpty()) {
                newName.append(oldFile.getName()).append("(").append(insertNumber).append(")");
                return newName.toString();
            }
            if (split.length > 2) {
                for (int i = 0; i < split.length; i++) {
                    if (i == split.length - 1) {
                        newName.append("(").append(insertNumber).append(")").append(".");
                        newName.append(split[split.length - 1]);
                        break;
                    }
                    newName.append(split[i]).append(".");
                }
                return newName.toString();
            }
            newName.append(split[0]).append("(").append(insertNumber).append(")").append(".").append(split[1]);
            return newName.toString();
        }
        newName.append(oldFile.getName()).append("(").append(insertNumber).append(")");
        return newName.toString();
    }

    private final int SEARCH_AND_DOWNLOAD = 0;
    private final int OTHER = 1;

    public FileServiceImpl(MyValFileProperties fileProperties, UserMapper userMapper, DeleteBinFileSourceMapper deleteBinFileSourceMapper) {
        this.fileProperties = fileProperties;
        this.userMapper = userMapper;
        this.deleteBinFileSourceMapper = deleteBinFileSourceMapper;
    }
}
