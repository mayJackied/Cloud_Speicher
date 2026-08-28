package com.zuantou.controller;

import com.zuantou.pojo.Result;
import com.zuantou.pojo.vo.MyFile;
import com.zuantou.service.FileService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/file")
@Tag(name = "Files")
public class FileController {
    final private FileService fileService;



    @GetMapping("/getFiles")
    public Result<List<MyFile>> getFiles(){
        return fileService.getFiles();
    }


    public FileController(FileService fileService) {
        this.fileService = fileService;
    }
}
