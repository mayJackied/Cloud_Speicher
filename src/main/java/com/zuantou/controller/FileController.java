package com.zuantou.controller;

import com.zuantou.pojo.vo.*;
import com.zuantou.pojo.dto.file.*;
import com.zuantou.pojo.dto.file.continueableDTO.CloseUploadDTO;
import com.zuantou.pojo.dto.file.continueableDTO.ContinuableDownloadDTO;
import com.zuantou.pojo.dto.file.continueableDTO.ContinuableUploadDTO;
import com.zuantou.pojo.dto.file.continueableDTO.GetUploadedSizeDTO;
import com.zuantou.service.FileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/file")
public class FileController {
    final private FileService fileService;


    @GetMapping("/getFiles")
    public Result<FileVOS> getFiles() {
        return fileService.getFiles();
    }

    @PostMapping("/addFile")
    public Result<Void> addFile(@RequestBody FileDTO fileDTO) {
        return fileService.addFile(fileDTO);
    }

    @PostMapping("/deleteFile")
    public Result<Void> deleteFile(@RequestBody DeleteFileDTO deleteFileDTO) {
        return fileService.deleteFile(deleteFileDTO);
    }

    @PostMapping("/deleteFiles")
    public Result<Void> deleteFiles(@RequestBody List<DeleteFileDTO> deleteFileDTOS) {
        return fileService.deleteFiles(deleteFileDTOS);
    }

    @PostMapping("/renameFile")
    public Result<Void> renameFile(@RequestBody RenameFileDTO renameFileDTO) {
        return fileService.renameFile(renameFileDTO);
    }

    @PostMapping("/zip")
    public Result<Void> zip(@RequestBody ZipFileDTO zipFileDTO){
        return fileService.zip(zipFileDTO);
    }

    @PostMapping("/unzip")
    public Result<Void> unzip(@RequestBody ZipFileDTO zipFileDTO){
        return fileService.unzip(zipFileDTO);
    }

    @PostMapping("/moveFile")
    public Result<Void> moveFile(@RequestBody MoveFileDTO moveFileDTO){
        return fileService.moveFile(moveFileDTO);
    }

   @PostMapping("/deleteBinFile")
    public Result<Void> deleteBinFile(@RequestBody DeleteFileDTO deleteFileDTO){
        return fileService.deleteBinFile(deleteFileDTO);
    }

   @PostMapping("/deleteBinAllFiles")
    public Result<Void> deleteBinAllFiles(@RequestBody DeleteBinAllFilesDTO deleteBinAllFilesDTO){
        return fileService.deleteBinAllFiles(deleteBinAllFilesDTO);
    }

   @PostMapping("/restoreFile")
    public Result<Void> restoreFile(@RequestBody DeleteFileDTO deleteFileDTO){
        return fileService.restoreFile(deleteFileDTO);
    }

    @PostMapping("/initUpload")
    public Result<String> initUpload(@RequestBody String uploadFilePath){
        return fileService.initUpload(uploadFilePath);
    }

    @PostMapping("/continuableUploadFile")
    public Result<Void> uploadFile(@ModelAttribute ContinuableUploadDTO continuableUploadDTO, HttpServletRequest request) {
        return fileService.continuableUpload(continuableUploadDTO, request);
    }

    @GetMapping("/getUploadedSize")
    public Result<Long> getUploadedSize(GetUploadedSizeDTO getUploadedSizeDTO){
        return fileService.getUploadedSize(getUploadedSizeDTO);
    }

    @PostMapping("/closeUpload")
    public Result<Void> closeUpload(@RequestBody CloseUploadDTO closeUploadDTO){
        return fileService.closeUpload(closeUploadDTO);
    }

    @GetMapping("/getDownloadFileSize")
    public Result<Long> getDownloadFileSize(String path){
        return fileService.getDownloadFileSize(path);
    }

    @PostMapping("/downloadFile")
    public void downloadFile(@RequestBody ContinuableDownloadDTO continuableDownloadDTO, HttpServletResponse response) {
        fileService.continuableDownload(continuableDownloadDTO, response);
    }

    @PostMapping("/addStarFile")
    public Result<Void> addStarFile(@RequestBody StarFileDTO addStarFileDTO){
        return fileService.addStarFile(addStarFileDTO);
    }

    @PostMapping("/deleteStarredFile")
    public Result<Void> deleteStarredFile(@RequestBody StarFileDTO deleteStarredFileDTO){
        return fileService.deleteStarredFile(deleteStarredFileDTO);
    }

    @PostMapping("/getStarredFiles")
    public Result<List<StarredFileVO>> getStarredFiles(){
        return fileService.getStarredFiles();
    }

    @PostMapping("/creatShareLink")
    public Result<CreatShareLinkVO> creatShareLink(@RequestBody CreatShareLinkDTO creatShareLinkDTO){
        return fileService.creatShareLink(creatShareLinkDTO);
    }

    @PostMapping("/addShareFileByShareLink")
    public Result<SharedFileVO> addShareFileByShareLink(@RequestBody String link){
        return fileService.addShareFileByShareLink(link);
    }

    @PostMapping("/deleteSharedFile")
    public Result<Void> deleteSharedFile(@RequestBody String link){
        return fileService.deleteSharedFile(link);
    }

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }
}
