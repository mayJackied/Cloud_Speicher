package com.zuantou.controller;

import com.zuantou.pojo.Result;
import com.zuantou.pojo.dto.*;
import com.zuantou.pojo.vo.FilesVO;
import com.zuantou.service.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/file")
@Tag(name = "Files")
public class FileController {
    final private FileService fileService;


    @GetMapping("/getFiles")
    @Operation(summary = "get_file")
    public Result<List<FilesVO>> getFiles() {
        return fileService.getFiles();
    }

    @PostMapping("/addFile")
    @Operation(summary = "add_file")
    public Result<Void> addFile(@RequestBody AddFileDTO fileDTO) {
        return fileService.addFile(fileDTO);
    }

    @PostMapping("/deleteFile")
    @Operation(summary = "delete_file")
    public Result<Void> deleteFile(@RequestBody DeleteFileDTO deleteFileDTO) {
        return fileService.deleteFile(deleteFileDTO);
    }

    @PostMapping("/renameFile")
    @Operation(summary = "rename_file")
    public Result<Void> renameFile(@RequestBody RenameFileDTO renameFileDTO) {
        return fileService.renameFile(renameFileDTO);
    }

    @PostMapping("/uploadFile")
    public Result<Void> uploadFile(@ModelAttribute UploadFileDTO uploadFileDTO) {
        return fileService.uploadFile(uploadFileDTO);
    }

    @PostMapping("/downloadFile")
    public void downloadFile(@RequestBody DownloadFileDTO downloadFileDTO, HttpServletResponse response) {
        fileService.downloadFile(downloadFileDTO, response);
    }

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }
}
