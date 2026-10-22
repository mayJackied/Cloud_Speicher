package com.zuantou.common.utils;

import com.zuantou.pojo.FilePath;
import com.zuantou.pojo.UploadFolder;
import com.zuantou.pojo.vo.FileListVO;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class FileUtil {
    public static FileListVO getFiles(String path){
        File file = new File(path);
        List<FileListVO> list = new ArrayList<>();

        String[] strings = file.list();

        if (strings != null){
            for (String string : strings) {
                list.add(getFiles(path+"/"+string));
            }
        }

        if (list.isEmpty()){
            return new FileListVO(null, file.getName(),file.length(),file.lastModified(),file.isFile());
        }

        return new FileListVO(list, file.getName(),file.length(),file.lastModified(),file.isFile());
    }

    public static List<FilePath> getFilePath(List<UploadFolder> content) {
        List<FilePath> paths = new ArrayList<>();
        for (UploadFolder folder : content) {
            getFilePath(folder.getInitUploadFolders(), folder.getUploadFilePath(), paths);
        }
        return paths;
    }

    private static void getFilePath(List<UploadFolder.Folder> folders, String parentPath, List<FilePath> paths) {
        if (folders == null) {
            paths.add(new FilePath(parentPath, false));
            return;
        }
        for (UploadFolder.Folder folder : folders) {
            String path = parentPath + "/" + folder.getFileName();
            if (folder.isFile()) paths.add(new FilePath(path, true));
            else getFilePath(folder.getInitUploadFolders(), path, paths);
        }
    }

}
