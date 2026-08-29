package com.zuantou.service;

import com.zuantou.pojo.Result;
import com.zuantou.pojo.dto.DeleteFileDTO;
import com.zuantou.pojo.dto.FileDTO;
import com.zuantou.pojo.vo.FilesVO;

import java.util.List;

public interface FileService {
    Result<List<FilesVO>> getFiles();

    Result<Void> addFile(FileDTO fileDTO);

    Result<Void> deleteFile(DeleteFileDTO deleteFileDTO);
}
