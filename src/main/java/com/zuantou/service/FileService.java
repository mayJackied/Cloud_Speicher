package com.zuantou.service;

import com.zuantou.pojo.Result;
import com.zuantou.pojo.dto.file.*;
import com.zuantou.pojo.dto.file.continueableDTO.CloseUploadDTO;
import com.zuantou.pojo.dto.file.continueableDTO.ContinuableDownloadDTO;
import com.zuantou.pojo.dto.file.continueableDTO.ContinuableUploadDTO;
import com.zuantou.pojo.dto.file.continueableDTO.GetUploadedSizeDTO;
import com.zuantou.pojo.vo.FilesVO;
import jakarta.servlet.http.HttpServletResponse;

import java.util.List;

public interface FileService {
    Result<List<FilesVO>> getFiles();

    Result<Void> addFile(FileDTO fileDTO);

    Result<Void> deleteFile(DeleteFileDTO deleteFileDTO);

    Result<Void> deleteFiles(List<DeleteFileDTO> deleteFileDTOS);

    Result<Void> renameFile(RenameFileDTO renameFileDTO);

    Result<Void> zip(ZipFileDTO zipFileDTO);

    Result<Void> unzip(ZipFileDTO zipFileDTO);

    Result<Void> moveFile(MoveFileDTO moveFileDTO);

    Result<Void> deleteBinFile(DeleteFileDTO deleteFileDTO);

    Result<Void> deleteBinAllFiles(DeleteBinAllFilesDTO deleteBinAllFilesDTO);

    Result<Void> restoreFile(DeleteFileDTO deleteFileDTO);

    Result<String> initUpload();

    Result<Void> continuableUpload(ContinuableUploadDTO continuableUploadDTO);

    Result<Long> getUploadedSize(GetUploadedSizeDTO getUploadedSizeDTO);

    Result<Void> closeUpload(CloseUploadDTO closeUploadDTO);

    void continuableDownload(ContinuableDownloadDTO continuableDownloadDTO, HttpServletResponse response);
}
