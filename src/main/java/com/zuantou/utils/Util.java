package com.zuantou.utils;

import com.zuantou.pojo.vo.FilesVO;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class Util {
    public static FilesVO getFiles(String path){
        File file = new File(path);
        List<FilesVO> list = new ArrayList<>();

        String[] strings = file.list();

        if (strings != null){
            for (String string : strings) {
                list.add(getFiles(path+"/"+string));
            }
        }

        if (list.isEmpty()){
            return new FilesVO(null, file.getName(),file.length(),file.lastModified(),file.isFile());
        }

        return new FilesVO(list, file.getName(),file.length(),file.lastModified(),file.isFile());
    }

}
