package com.zuantou.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.zuantou.common.exception.BusinessException;
import com.zuantou.common.properties.CommonProperties;
import com.zuantou.common.properties.ErrorCode;
import com.zuantou.common.utils.ZipUtil;
import com.zuantou.mapper.file.ContinuableUploadMapper;
import com.zuantou.mapper.file.DeleteBinFileSourceMapper;
import com.zuantou.mapper.file.StarredFileMapper;
import com.zuantou.mapper.user.UserMapper;
import com.zuantou.pojo.ContinuableUpload;
import com.zuantou.pojo.DeleteBinFileSource;
import com.zuantou.pojo.StarredFile;
import com.zuantou.pojo.User;
import com.zuantou.common.utils.UserContext;
import com.zuantou.common.properties.MyValFileProperties;
import com.zuantou.pojo.vo.Result;
import com.zuantou.pojo.dto.file.*;
import com.zuantou.pojo.dto.file.continueableDTO.CloseUploadDTO;
import com.zuantou.pojo.dto.file.continueableDTO.ContinuableDownloadDTO;
import com.zuantou.pojo.dto.file.continueableDTO.ContinuableUploadDTO;
import com.zuantou.pojo.dto.file.continueableDTO.GetUploadedSizeDTO;
import com.zuantou.pojo.vo.FilesVO;
import com.zuantou.pojo.vo.StarredFileVO;
import com.zuantou.service.FileService;
import com.zuantou.common.utils.FileUtil;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.BeanUtils;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Service
public class FileServiceImpl implements FileService {
    private final MyValFileProperties fileProperties;
    private final UserMapper userMapper;
    private final DeleteBinFileSourceMapper deleteBinFileSourceMapper;
    private final ContinuableUploadMapper continuableUploadMapper;
    private final StarredFileMapper starredFileMapper;

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
        Integer errorCode = checkFilePermission(addFileDTO.getPath(), OTHER, CommonProperties.COMMON_ADD_OPERATION);

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

    private DeleteBinFileSource deleteFileMethode(DeleteFileDTO deleteFileDTO) {
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
            targetDir = Paths.get(fileProperties.getPath() + '/' + UserContext.getUserId() + "/", fileProperties.getRecycleBinName());
        }

        File newFile = new File(targetDir.toString(), String.valueOf(oldPath.getFileName()));

        if (newFile.exists()) {
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
            case CommonProperties.USER_PATH ->
                    path = fileProperties.getPath() + '/' + UserContext.getUserId() + "/" + fileProperties.getRecycleBinName();
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
        if (newFile.exists()) {
            File newNamedFile = insertedFile(oldFile, newFile.getParentFile());
            if (newFile.isFile()) {
                try {
                    if (!newNamedFile.createNewFile()) {
                        return Result.error(ErrorCode.EXCEPTION);
                    }
                } catch (IOException e) {
                    throw new BusinessException(ErrorCode.EXCEPTION);
                }
            } else {
                if (!newNamedFile.mkdir()) {
                    return Result.error(ErrorCode.EXCEPTION);
                }
            }
            try {
                Files.move(oldFile.toPath(), newNamedFile.toPath());
            } catch (IOException e) {
                return Result.error(ErrorCode.EXCEPTION);
            }
        } else {
            try {
                Files.move(oldFile.toPath(), newFile.toPath());
            } catch (IOException e) {
                return Result.error(ErrorCode.EXCEPTION);
            }
        }
        deleteBinFileSourceMapper.deleteById(deleteBinFileSource.getNewPath());
        return Result.success();
    }

    @Override
    public Result<String> initUpload() {
        String uuid = UUID.randomUUID().toString();
        continuableUploadMapper.insert(new ContinuableUpload(uuid, null));
        return Result.success(uuid);
    }

    @Override
    public Result<Void> continuableUpload(ContinuableUploadDTO continuableUploadDTO) {
        Integer errorCode = checkFilePermission(continuableUploadDTO.getTargetPath(), OTHER, CommonProperties.COMMON_PATH_OPERATION);
        if (errorCode != null) {
            return Result.error(errorCode);
        }

        MultipartFile multipartFile = continuableUploadDTO.getMultipartFile();

        if (multipartFile == null || multipartFile.isEmpty()) {
            return Result.error(ErrorCode.FILE_OPERATION_FAILED);
        }

        ContinuableUpload continuableUpload = continuableUploadMapper.selectById(continuableUploadDTO.getUploadKey());

        if (continuableUpload == null) {
            return Result.error(ErrorCode.UPLOAD_KEY_NOT_FOUND);
        }

        File uploadFilePath;

        switch (continuableUploadDTO.getUploadType()) {
            case ContinuableUploadDTO.FIRST_UPLOAD_TYPE -> {
                String fileName = multipartFile.getOriginalFilename();

                if (fileName == null || fileName.isBlank()) {
                    return Result.error(ErrorCode.FILE_NAME_ILLEGAL);
                }

                File newFile = new File(continuableUploadDTO.getTargetPath(), fileName);

                if (newFile.exists()) {
                    newFile = insertedFile(newFile, newFile.getParentFile());
                }
                uploadFilePath = newFile;
                continuableUpload.setUploadFilePath(newFile.getPath());
                continuableUploadMapper.updateById(continuableUpload);
            }
            case ContinuableUploadDTO.NOT_FIRST_UPLOAD_TYPE -> {
                String path = continuableUpload.getUploadFilePath();
                if (path == null || path.isEmpty()) {
                    return Result.error(ErrorCode.UPLOAD_KEY_NOT_FOUND);
                }
                uploadFilePath = new File(path);
            }
            default -> {
                return Result.error(ErrorCode.ARGS_ILLEGAL);
            }
        }

        try (InputStream input = multipartFile.getInputStream();
             FileOutputStream fos = new FileOutputStream(uploadFilePath, true)) {

            byte[] buffer = new byte[fileProperties.getUploadBufferSize() * 1024 * 1024];
            int len;

            while ((len = input.read(buffer)) != -1) {
                fos.write(buffer, 0, len);
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        return Result.success();
    }

    @Override
    public Result<Long> getUploadedSize(GetUploadedSizeDTO getUploadedSizeDTO) {
        ContinuableUpload continuableUpload = continuableUploadMapper.selectById(getUploadedSizeDTO.getUploadKey());
        if (continuableUpload == null) {
            return Result.error(ErrorCode.UPLOAD_KEY_NOT_FOUND);
        }
        try {
            return Result.success(Files.size(Path.of(continuableUpload.getUploadFilePath())));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public Result<Void> closeUpload(CloseUploadDTO closeUploadDTO) {
        ContinuableUpload continuableUpload = continuableUploadMapper.selectById(closeUploadDTO.getUploadKey());
        if (continuableUpload == null) {
            return Result.error(ErrorCode.UPLOAD_KEY_NOT_FOUND);
        }
        continuableUploadMapper.deleteById(continuableUpload.getUploadKey());
        return Result.success();
    }

    @Override
    public void continuableDownload(ContinuableDownloadDTO continuableDownloadDTO, HttpServletResponse response) {
        Integer errorCode = checkFilePermission(continuableDownloadDTO.getDownloadFilePath(), SEARCH_OR_DOWNLOAD_OR_STAR, CommonProperties.COMMON_PATH_OPERATION);

        if (errorCode != null) {
            throw new BusinessException(errorCode);
        }

        File downloadFile = new File(continuableDownloadDTO.getDownloadFilePath());

        if (!downloadFile.exists()) {
            throw new BusinessException(ErrorCode.FILE_NOT_FOUND);
        }

        response.setContentType("application/octet-stream");

        ContentDisposition contentDisposition = ContentDisposition
                .attachment()
                .filename(downloadFile.getName(), StandardCharsets.UTF_8)
                .build();

        response.setHeader(
                HttpHeaders.CONTENT_DISPOSITION,
                contentDisposition.toString()
        );
        try (FileInputStream fis = new FileInputStream(downloadFile); OutputStream os = response.getOutputStream()) {
            if (continuableDownloadDTO.getDownloadType() == ContinuableDownloadDTO.NOT_FIRST_DOWNLOAD_TYPE) {
                Long downloadedSize = continuableDownloadDTO.getDownloadedSize();
                if (downloadedSize == null) {
                    throw new BusinessException(ErrorCode.ARGS_ILLEGAL);
                }
                long skipped = fis.skip(downloadedSize);

                if (skipped != downloadedSize) {
                    throw new BusinessException(ErrorCode.ARGS_ILLEGAL);
                }
            }
            byte[] buffer = new byte[fileProperties.getUploadBufferSize() * 1024 * 1024];

            int len;

            while ((len = fis.read(buffer)) != -1) {
                os.write(buffer, 0, len);
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public Result<Void> addStarFile(StarFileDTO addStarFileDTO) {
        Integer errorCode = checkFilePermission(addStarFileDTO.getStarFilePath(), SEARCH_OR_DOWNLOAD_OR_STAR, CommonProperties.COMMON_PATH_OPERATION);
        if (errorCode != null) {
            return Result.error(errorCode);
        }
        StarredFile starredFile = starredFileMapper.selectOne(
                new LambdaQueryWrapper<StarredFile>()
                        .eq(StarredFile::getUserId, UserContext.getUserId())
                        .eq(StarredFile::getStarredFilePath, addStarFileDTO.getStarFilePath())
        );
        if (starredFile == null) {
            starredFileMapper.insert(new StarredFile(UserContext.getUserId(), addStarFileDTO.getStarFilePath()));
            return Result.success();
        }
        return Result.error(ErrorCode.FILE_STARRED);
    }

    @Override
    public Result<Void> deleteStarredFile(StarFileDTO deleteStarredFileDTO) {
        Integer errorCode = checkFilePermission(deleteStarredFileDTO.getStarFilePath(), SEARCH_OR_DOWNLOAD_OR_STAR, CommonProperties.COMMON_PATH_OPERATION);
        if (errorCode != null) {
            return Result.error(errorCode);
        }
        starredFileMapper.delete(
                new LambdaQueryWrapper<StarredFile>()
                        .eq(StarredFile::getUserId, UserContext.getUserId())
                        .eq(StarredFile::getStarredFilePath, deleteStarredFileDTO.getStarFilePath())
        );
        return Result.success();
    }

    @Override
    public Result<List<StarredFileVO>> getStarredFiles() {
        List<StarredFileVO> starredFileVOS = new ArrayList<>();
        BeanUtils.copyProperties(starredFileMapper.selectStarredFilesByUserId(UserContext.getUserId()),starredFileVOS);
        return Result.success(starredFileVOS);
    }

    // 分享, 收藏

    /**
     * @param path          对象文件的路径
     * @param operationType 对对象文件的操作是在 public 文件里面被普通用户允许的查找、下载或者是添加收藏 还是 在其它不被允许的
     * @param fileType      这个文件的类型是普通文件 还是 回收站的文件
     * @return 错误码 or null
     */
    private Integer checkFilePermission(String path, int operationType, int fileType) {
        Path target = Paths.get(path).toAbsolutePath().normalize();
        if (fileType != CommonProperties.COMMON_ADD_OPERATION) {
            if (!target.toFile().exists()) {
                return ErrorCode.FILE_NOT_FOUND;
            }
        }
        Path publicPath;
        Path userPath;

        switch (fileType) {
            case CommonProperties.COMMON_PATH_OPERATION, CommonProperties.COMMON_ADD_OPERATION -> {
                publicPath = Paths.get(fileProperties.getPublicPath()).toAbsolutePath().normalize();
                userPath = Paths.get(fileProperties.getPath(), UserContext.getUserId().toString()).toAbsolutePath().normalize();
            }
            case CommonProperties.BIN_PATH_OPERATION -> {
                publicPath = Paths.get(fileProperties.getPublicPath() + fileProperties.getRecycleBinName()).toAbsolutePath().normalize();
                userPath = Paths.get(fileProperties.getPath() + '/' + UserContext.getUserId() + "/" + fileProperties.getRecycleBinName()).toAbsolutePath().normalize();
            }
            default -> {
                return ErrorCode.EXCEPTION;
            }
        }

        if (!target.startsWith(userPath) && !target.startsWith(publicPath)) {
            return ErrorCode.NO_PERMISSION;
        }

        if (fileType == CommonProperties.BIN_PATH_OPERATION) {
            if (target.startsWith(publicPath) || target.startsWith(userPath)) {
                return ErrorCode.BIN_FILE_NOT_ALLOWED;
            }
        }

        User user = userMapper.selectById(UserContext.getUserId());
        if (user == null) {
            return ErrorCode.USER_NOT_FOUND;
        }
        boolean admin = user.isAdmin();

        if (target.startsWith(userPath) || admin || (operationType == SEARCH_OR_DOWNLOAD_OR_STAR && !target.startsWith(userPath))) {
            return null;
        }
        return ErrorCode.NO_PERMISSION;
    }

    private Path isBinPath(String path) {
        Path binPath = Paths.get(path).toAbsolutePath().normalize();
        Path publicBinPath = Paths.get(fileProperties.getPublicPath() + fileProperties.getRecycleBinName()).toAbsolutePath().normalize();
        Path userBinPath = Paths.get(fileProperties.getPath() + '/' + UserContext.getUserId() + "/" + fileProperties.getRecycleBinName()).toAbsolutePath().normalize();

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

    private final int SEARCH_OR_DOWNLOAD_OR_STAR = 0;
    private final int OTHER = 1;

    public FileServiceImpl(MyValFileProperties fileProperties, UserMapper userMapper, DeleteBinFileSourceMapper deleteBinFileSourceMapper, ContinuableUploadMapper continuableUploadMapper, StarredFileMapper starredFileMapper) {
        this.fileProperties = fileProperties;
        this.userMapper = userMapper;
        this.deleteBinFileSourceMapper = deleteBinFileSourceMapper;
        this.continuableUploadMapper = continuableUploadMapper;
        this.starredFileMapper = starredFileMapper;
    }
}
