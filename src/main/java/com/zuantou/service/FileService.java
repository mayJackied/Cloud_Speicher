package com.zuantou.service;

import com.zuantou.pojo.Result;
import com.zuantou.pojo.dto.*;
import com.zuantou.pojo.vo.FilesVO;
import jakarta.servlet.http.HttpServletResponse;

import java.util.List;

public interface FileService {
    Result<List<FilesVO>> getFiles();

    Result<Void> addFile(FileDTO fileDTO);

    Result<Void> deleteFile(DeleteFileDTO deleteFileDTO);

    Result<Void> renameFile(RenameFileDTO renameFileDTO);

    Result<Void> uploadFile(UploadFileDTO uploadFileDTO);

    void downloadFile(DownloadFileDTO downloadFileDTO, HttpServletResponse response);

    Result<Void> zip(ZipFileDTO zipFileDTO);

    Result<Void> unzip(ZipFileDTO zipFileDTO);
}
